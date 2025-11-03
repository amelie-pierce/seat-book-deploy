import { bookingService } from '../services/bookingService';
import { BookingRecord } from './bookingStorage';

/**
 * Process booking modifications for a single seat
 * @param seatId - The seat ID to process bookings for
 * @param modifiedDates - Object mapping date strings to boolean (true = book, false = cancel)
 * @param currentUser - The current user ID
 * @returns Promise that resolves when all modifications are complete
 */
export async function processSeatBookingModifications(
  seatId: string,
  modifiedDates: { [dateStr: string]: boolean },
  currentUser: string
): Promise<void> {
  for (const [dateStr, shouldBook] of Object.entries(modifiedDates)) {
    if (shouldBook) {
      // Add new booking
      await bookingService.createBooking(
        currentUser,
        seatId,
        "FULL_DAY",
        dateStr
      );
    } else {
      // Remove booking - find the booking ID first
      const userData = await bookingService.loadUserData(currentUser);
      const bookingToRemove = userData.userBookings.find(
        (b: BookingRecord) => b.seatId === seatId && b.date === dateStr
      );
      
      if (bookingToRemove) {
        await bookingService.cancelBooking(bookingToRemove.id, currentUser);
      }
    }
  }
}

/**
 * Process booking modifications for multiple seats
 * @param dateModifications - Object mapping seat IDs to their date modifications
 * @param currentUser - The current user ID
 * @returns Promise that resolves when all modifications are complete
 */
export async function processMultipleSeatBookingModifications(
  dateModifications: { [seatId: string]: { [dateStr: string]: boolean } },
  currentUser: string
): Promise<void> {
  for (const [seatId, modifications] of Object.entries(dateModifications)) {
    await processSeatBookingModifications(seatId, modifications, currentUser);
  }
}
