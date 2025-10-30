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
import { supabase } from '../utils/supabase';

export class BookingService {
  // Get all bookings for a user
  async getUserBookings(userId: string): Promise<BookingRecord[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.reservation_id,
      userId: r.user_id,
      seatId: r.table_id,
      date: r.date,
      timeSlot: r.slot_type,
      bookingTimestamp: r.created_at,
      status: 'ACTIVE',
      tableNumber: r.table_id.charAt(0),
    }));
  }

  // Get bookings for a specific date
  async getBookingsForDate(date: string): Promise<BookingRecord[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('date', date);
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.reservation_id,
      userId: r.user_id,
      seatId: r.table_id,
      date: r.date,
      timeSlot: r.slot_type,
      bookingTimestamp: r.created_at,
      status: 'ACTIVE',
      tableNumber: r.table_id.charAt(0),
    }));
  }

  // Create a new booking
  async createBooking(
    userId: string,
    seatId: string,
    timeSlot: 'AM' | 'PM' | 'FULL_DAY',
    date?: string
  ): Promise<{ success: boolean; booking?: BookingRecord; error?: string }> {
    const bookingDate = date || getTodayDate();
    // Check if user already has a booking for this date
    const { data: existingBookings, error: existingError } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .eq('date', bookingDate);
    if (existingError) {
      return { success: false, error: existingError.message };
    }
    if (existingBookings && existingBookings.length > 0) {
      return { success: false, error: 'You already have a booking for this date.' };
    }
    const newBooking: BookingRecord = {
      id: generateBookingId(),
      userId,
      seatId,
      date: bookingDate,
      timeSlot,
      bookingTimestamp: new Date().toISOString(),
      status: 'ACTIVE',
      tableNumber: seatId.charAt(0),
    };
    const reservation = {
      reservation_id: newBooking.id,
      user_id: newBooking.userId,
      table_id: newBooking.seatId,
      date: newBooking.date,
      slot_type: newBooking.timeSlot,
      created_at: newBooking.bookingTimestamp,
    };
    const { error } = await supabase
      .from('reservations')
      .upsert([reservation], { onConflict: 'reservation_id' });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, booking: newBooking };
  }

  // Cancel a booking
  async cancelBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/reservations?id=${bookingId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Failed to delete booking' };
      }
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to delete booking' };
    }
  }

  // Get reserved seats for a specific date
  async getReservedSeats(date?: string): Promise<string[]> {
    const targetDate = date || getTodayDate();
    const { data, error } = await supabase
      .from('reservations')
      .select('table_id')
      .eq('date', targetDate);
    if (error) throw error;
    return (data || []).map(r => r.table_id);
  }

  // Get user's current booking for today
  async getUserTodayBooking(userId: string): Promise<BookingRecord | null> {
    const today = getTodayDate();
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today);
    if (error) throw error;
    if (!data || data.length === 0) return null;
    const r = data[0];
    return {
      id: r.reservation_id,
      userId: r.user_id,
      seatId: r.table_id,
      date: r.date,
      timeSlot: r.slot_type,
      bookingTimestamp: r.created_at,
      status: 'ACTIVE',
      tableNumber: r.table_id.charAt(0),
    };
  }

  // Get booking statistics
  async getBookingStats(): Promise<{
    totalBookings: number;
    activeBookings: number;
    todayBookings: number;
    cancelledBookings: number;
  }> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*');
    if (error) throw error;
    const today = getTodayDate();
    return {
      totalBookings: data ? data.length : 0,
      activeBookings: data ? data.length : 0,
      todayBookings: data ? data.filter((b: { date: string }) => b.date === today).length : 0,
      cancelledBookings: 0 // If you add a status column, update this logic
    };
  }
}

export const bookingService = new BookingService();
