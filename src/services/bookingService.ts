// Booking service for managing CSV-based booking data
// This service works with CSV files and only stores user ID in localStorage
// All booking data is read from CSV files and kept in memory cache

import {
  BookingRecord,
  generateBookingId,
  hasUserBookingForDate,
  getUserBookingForDate,
  getReservedSeatsForDate,
  getTodayDate
} from '../utils/bookingStorage';
import { vercelDataService, SeatConflictError } from './vercelDataService';

export class BookingService {
  private cachedBookings: BookingRecord[] = [];
  private isInitialized = false;

  // Initialize database connection and load all data
  async initializeDatabase(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {

      // Initialize Vercel data service (will only make API call if not already initialized)
      await vercelDataService.initialize();

      // Load reservations from Vercel data service and convert to bookings
      // This will NOT make additional API calls since service is now initialized
      const reservationBookings = await vercelDataService.getBookingsFromReservations();
      this.cachedBookings = reservationBookings;

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      this.cachedBookings = [];
      this.isInitialized = true;
    }
  }

  // Refresh data from API
  async refreshFromCsv(): Promise<void> {

    // Make sure we're initialized first, but don't force a refresh if we just initialized
    if (!this.isInitialized) {
      await this.initializeDatabase();
      return;
    }

    // Force refresh data from API only if we're already initialized
    await vercelDataService.refreshFromApi();
    // Get fresh bookings (no need to re-initialize since refreshFromApi already loaded fresh data)
    const reservationBookings = await vercelDataService.getBookingsFromReservations();
    this.cachedBookings = reservationBookings;
  }

  // Force refresh after a booking conflict to get latest state
  async refreshAfterConflict(): Promise<void> {
    await this.refreshFromCsv();
  }

  // Load user-specific data on app open
  async loadUserData(userId: string): Promise<{
    userBookings: BookingRecord[];
    todayBooking: BookingRecord | null;
    totalBookings: number;
  }> {
    await this.initializeDatabase();

    const userBookings = this.cachedBookings.filter(b =>
      b.userId === userId &&
      b.status === 'ACTIVE'
    );
    const todayBooking = getUserBookingForDate(this.cachedBookings, userId, getTodayDate());

    return {
      userBookings,
      todayBooking,
      totalBookings: userBookings.length
    };
  }

  // Create multiple bookings in a single operation
  async createMultipleBookings(
    userId: string,
    bookings: Array<{ seatId: string; timeSlot: 'AM' | 'PM' | 'FULL_DAY'; date: string }>
  ): Promise<{ success: boolean; bookings?: BookingRecord[]; error?: string; failedBookings?: string[] }> {
    await this.initializeDatabase();

    try {
      const createdBookings: BookingRecord[] = [];
      const failedBookings: string[] = [];

      // Validate all bookings first
      for (const bookingRequest of bookings) {
        const { seatId, timeSlot, date } = bookingRequest;

        // Check if user already has a booking for this date
        if (hasUserBookingForDate(this.cachedBookings, userId, date)) {
          failedBookings.push(`You already have a booking for ${date}`);
          continue;
        }

        // Check if seat is already booked for this date and time
        const existingBooking = this.cachedBookings.find((b: BookingRecord) =>
          b.seatId === seatId &&
          b.date === date &&
          b.status === 'ACTIVE' && (
            timeSlot === 'FULL_DAY' || // If requesting full day, check any existing booking
            b.timeSlot === 'FULL_DAY' || // If existing booking is full day, conflict with any request
            b.timeSlot === timeSlot // If requesting same time slot as existing booking
          )
        );

        if (existingBooking) {
          failedBookings.push(`Seat ${seatId} is already booked for ${date} (${timeSlot})`);
          continue;
        }

        // Create new booking record
        const newBooking: BookingRecord = {
          id: generateBookingId(),
          userId,
          seatId,
          date,
          timeSlot,
          bookingTimestamp: new Date().toISOString(),
          status: 'ACTIVE',
          tableNumber: seatId.charAt(0), // Extract table letter
        };

        createdBookings.push(newBooking);
      }

      // If there are validation failures, return them
      if (failedBookings.length > 0 && createdBookings.length === 0) {
        return {
          success: false,
          error: failedBookings.join('; '),
          failedBookings
        };
      }

      // Save all valid bookings with individual conflict detection
      const successfulBookings: BookingRecord[] = [];

      for (const booking of createdBookings) {
        try {
          // Add to cache optimistically
          this.cachedBookings.push(booking);

          // Save to API with conflict detection
          await vercelDataService.saveBookingAsReservation(booking);
          successfulBookings.push(booking);

        } catch (error) {
          // Remove from cache if save failed
          const index = this.cachedBookings.indexOf(booking);
          if (index > -1) {
            this.cachedBookings.splice(index, 1);
          }

          // Handle seat conflict
          if (error instanceof SeatConflictError) {
            failedBookings.push(`Seat ${booking.seatId} on ${booking.date}: Already booked by another user`);
          } else {
            failedBookings.push(`Seat ${booking.seatId} on ${booking.date}: Save failed`);
          }
        }
      }

      const hasSuccess = successfulBookings.length > 0;
      const hasFailures = failedBookings.length > 0;

      return {
        success: hasSuccess,
        bookings: successfulBookings,
        ...(hasFailures && {
          error: `Some bookings failed: ${failedBookings.join('; ')}`,
          failedBookings
        })
      };
    } catch (error) {
      console.error('❌ Error in batch booking operation:', error);
      return { success: false, error: 'Failed to process bookings' };
    }
  }

  // Create a new booking and immediately save to CSV
  async createBooking(
    userId: string,
    seatId: string,
    timeSlot: 'AM' | 'PM' | 'FULL_DAY',
    date?: string
  ): Promise<{ success: boolean; booking?: BookingRecord; error?: string }> {
    await this.initializeDatabase();

    try {
      const bookingDate = date || getTodayDate();

      // Check if user already has a booking for this date
      if (hasUserBookingForDate(this.cachedBookings, userId, bookingDate)) {
        return {
          success: false,
          error: 'You already have a booking for this date. Only one booking per day is allowed.'
        };
      }

      // Check if seat is already booked for this date and time
      const existingBooking = this.cachedBookings.find((b: BookingRecord) =>
        b.seatId === seatId &&
        b.date === bookingDate &&
        b.status === 'ACTIVE' && (
          timeSlot === 'FULL_DAY' || // If requesting full day, check any existing booking
          b.timeSlot === 'FULL_DAY' || // If existing booking is full day, conflict with any request
          b.timeSlot === timeSlot // If requesting same time slot as existing booking
        )
      );

      if (existingBooking) {
        return {
          success: false,
          error: 'This seat is already booked for the selected time slot.'
        };
      }

      // Create new booking record
      const newBooking: BookingRecord = {
        id: generateBookingId(),
        userId,
        seatId,
        date: bookingDate,
        timeSlot,
        bookingTimestamp: new Date().toISOString(),
        status: 'ACTIVE',
        tableNumber: seatId.charAt(0), // Extract table letter
      };

      try {
        // Add to cache and save to API with conflict detection
        this.cachedBookings.push(newBooking);
        await vercelDataService.saveBookingAsReservation(newBooking);

        return { success: true, booking: newBooking };

      } catch (saveError) {
        // Remove from cache if save failed
        const index = this.cachedBookings.indexOf(newBooking);
        if (index > -1) {
          this.cachedBookings.splice(index, 1);
        }

        // Handle specific seat conflict error
        if (saveError instanceof SeatConflictError) {
          console.error('⚠️ Seat booking conflict detected:', saveError.message);
          return {
            success: false,
            error: `Seat already taken! ${saveError.message}. Please refresh and choose another seat.`
          };
        }

        throw saveError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      // Handle specific seat conflict error
      if (error instanceof SeatConflictError) {
        console.error('⚠️ Seat booking conflict detected:', error.message);
        return {
          success: false,
          error: `Seat already taken! ${error.message}. Please refresh and choose another seat.`
        };
      }

      console.error('❌ Error creating booking:', error);
      return { success: false, error: 'Failed to create booking. Please try again.' };
    }
  }


  // Cancel a booking and update CSV
  async cancelBooking(bookingId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    await this.initializeDatabase();

    try {
      const bookingIndex = this.cachedBookings.findIndex((b: BookingRecord) =>
        b.id === bookingId && b.userId === userId
      );

      if (bookingIndex === -1) {
        return { success: false, error: 'Booking not found' };
      }

      // Update booking status in cache
      this.cachedBookings[bookingIndex].status = 'CANCELLED';
      this.cachedBookings[bookingIndex].modifiedTimestamp = new Date().toISOString();
      this.cachedBookings[bookingIndex].modifiedBy = userId;

      // Delete from CSV data service
      await vercelDataService.deleteReservation(bookingId);

      return { success: true };
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      return { success: false, error: 'Failed to cancel booking' };
    }
  }

  // Get user's current booking for today (from cache)
  async getUserTodayBooking(userId: string): Promise<BookingRecord | null> {
    await this.initializeDatabase();
    return getUserBookingForDate(this.cachedBookings, userId, getTodayDate());
  }

  // Get reserved seats for a specific date (from cache)
  async getReservedSeats(date?: string): Promise<string[]> {
    await this.initializeDatabase();
    const targetDate = date || getTodayDate();
    return getReservedSeatsForDate(this.cachedBookings, targetDate);
  }

  // Get all bookings for a user (from cache)
  async getUserBookings(userId: string): Promise<BookingRecord[]> {
    await this.initializeDatabase();
    return this.cachedBookings.filter((b: BookingRecord) => b.userId === userId);
  }

  // Get bookings for a specific date
  async getBookingsForDate(date: string): Promise<BookingRecord[]> {
    await this.initializeDatabase();
    return this.cachedBookings.filter(booking =>
      booking.date === date && booking.status === 'ACTIVE'
    );
  }

  // Get booking statistics (from cache)
  async getBookingStats(): Promise<{
    totalBookings: number;
    activeBookings: number;
    todayBookings: number;
    cancelledBookings: number;
  }> {
    await this.initializeDatabase();
    const today = getTodayDate();

    return {
      totalBookings: this.cachedBookings.length,
      activeBookings: this.cachedBookings.filter((b: BookingRecord) => b.status === 'ACTIVE').length,
      todayBookings: this.cachedBookings.filter((b: BookingRecord) => b.date === today && b.status === 'ACTIVE').length,
      cancelledBookings: this.cachedBookings.filter((b: BookingRecord) => b.status === 'CANCELLED').length,
    };
  }

  // Get current cache status (for debugging)
  getCacheInfo(): { isInitialized: boolean; recordCount: number } {
    return {
      isInitialized: this.isInitialized,
      recordCount: this.cachedBookings.length
    };
  }
}

// Singleton instance
export const bookingService = new BookingService();
