// Vercel-compatible data service using API endpoints and in-memory storage
// This service replaces CSV file operations with API calls for Vercel deployment

import { 
  User, 
  ReservationRecord, 
  BookingRecord,
  reservationToBooking,
  bookingToReservation
} from '../utils/bookingStorage';

// Custom error types for booking conflicts
export class SeatConflictError extends Error {
  code = 'SEAT_CONFLICT';
  conflictDetails?: {
    seat: string;
    date: string;
    timeSlot: string;
    bookedBy: string;
  };

  constructor(message: string, conflictDetails?: SeatConflictError['conflictDetails']) {
    super(message);
    this.name = 'SeatConflictError';
    this.conflictDetails = conflictDetails;
  }
}

export class VercelDataService {
  private baseUrl: string;
  private cachedUsers: User[] = [];
  private cachedReservations: ReservationRecord[] = [];
  private isInitialized = false;
  private lastApiCall = 0;
  private readonly CACHE_DURATION = 5000; // 5 seconds cache to prevent rapid API calls
  private initializationPromise: Promise<void> | null = null; // Prevent concurrent initializations

  constructor() {
    // Use relative URLs that work on both development and production
    this.baseUrl = '';
  }

  // Initialize service by loading data from API endpoints
  async initialize(): Promise<void> {
    
    if (this.isInitialized) {
      return;
    }

    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this.performInitialization();
    
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async performInitialization(): Promise<void> {
    try {
      // Load initial data from API endpoints
      await this.loadFromApi();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error initializing Vercel service:', error);
      this.cachedUsers = [];
      this.cachedReservations = [];
      this.isInitialized = true;
    }
  }

  // Load data from API endpoints
  private async loadFromApi(): Promise<void> {
    const now = Date.now();
    
    // Check if we recently loaded data (within cache duration)
    if (this.isInitialized && (now - this.lastApiCall) < this.CACHE_DURATION) {
      return;
    }

    try {
      
      // Load users from API
      const usersResponse = await fetch(`${this.baseUrl}/api/users`);
      if (!usersResponse.ok) {
        throw new Error(`Failed to load users: ${usersResponse.status}`);
      }
      const usersData = await usersResponse.json();
      this.cachedUsers = usersData.users || [];

      // Load reservations from API
      const reservationsResponse = await fetch(`${this.baseUrl}/api/reservations`);
      if (!reservationsResponse.ok) {
        throw new Error(`Failed to load reservations: ${reservationsResponse.status}`);
      }
      const reservationsData = await reservationsResponse.json();
      this.cachedReservations = reservationsData.reservations || [];

      this.lastApiCall = now;
    } catch (error) {
      console.error('❌ Error loading from API endpoints:', error);
      
      // Initialize with empty data instead of throwing error
      this.cachedUsers = [];
      this.cachedReservations = [];
    }
  }

  // Refresh data by re-reading from API (forces fresh API call)
  async refreshFromApi(): Promise<void> {
    // Reset timestamp to force fresh API call
    this.lastApiCall = 0;
    await this.loadFromApi();
  }

  // Get all users (assumes service is already initialized)
  async getUsers(): Promise<User[]> {
    // Don't call initialize() here - should already be initialized by parent calls
    return [...this.cachedUsers];
  }

  // Get user by ID (assumes service is already initialized)
  async getUserById(userId: string): Promise<User | null> {
    // Only initialize if not already done (for safety in standalone calls)
    if (!this.isInitialized) {
      await this.initialize();
    }
    const foundUser = this.cachedUsers.find(user => user.user_id === userId) || null;
    return foundUser;
  }

  // Get user by email (assumes service is already initialized)
  async getUserByEmail(email: string): Promise<User | null> {
    // Only initialize if not already done (for safety in standalone calls)
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.cachedUsers.find(user => user.email === email) || null;
  }

  // Add or update user via API
  async saveUser(user: User): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save user: ${response.status}`);
      }

      // Update local cache
      const existingIndex = this.cachedUsers.findIndex(u => u.user_id === user.user_id);
      if (existingIndex >= 0) {
        this.cachedUsers[existingIndex] = user;
      } else {
        this.cachedUsers.push(user);
      }
    } catch (error) {
      console.error('❌ Error saving user via API:', error);
      throw error;
    }
  }

  // Get all reservations (assumes service is already initialized)
  async getReservations(): Promise<ReservationRecord[]> {
    // Don't call initialize() here - should already be initialized by parent calls
    return [...this.cachedReservations];
  }

  // Get bookings converted from reservations
  async getBookingsFromReservations(): Promise<BookingRecord[]> {
    const reservations = await this.getReservations();
    return reservations.map(reservation => reservationToBooking(reservation));
  }

  // Save booking as reservation via API with conflict detection
  async saveBookingAsReservation(booking: BookingRecord): Promise<void> {
    try {
      const reservation = bookingToReservation(booking);
      
      const response = await fetch(`${this.baseUrl}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservation }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle specific conflict error
        if (response.status === 409 && responseData.error === 'SEAT_ALREADY_BOOKED') {
          const conflictError = new SeatConflictError(
            responseData.message || 'Seat is already booked by another user',
            responseData.conflictDetails
          );
          throw conflictError;
        }
        
        // Handle other errors
        throw new Error(`Failed to save reservation: ${response.status} - ${responseData.message || 'Unknown error'}`);
      }

      // Update local cache on successful save
      const existingIndex = this.cachedReservations.findIndex(r => r.reservation_id === reservation.reservation_id);
      if (existingIndex >= 0) {
        this.cachedReservations[existingIndex] = reservation;
      } else {
        this.cachedReservations.push(reservation);
      }
    } catch (error) {
      console.error('❌ Error saving reservation via API:', error);
      throw error;
    }
  }

  // Delete reservation via API
  async deleteReservation(reservationId: string): Promise<void> {
    if (!reservationId || reservationId.trim() === '') {
      throw new Error('Reservation ID is required for deletion');
    }
    
    try {
      const deleteUrl = `${this.baseUrl}/api/reservations?id=${encodeURIComponent(reservationId)}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        throw new Error(`Failed to delete reservation: ${response.status} - ${errorData.error || errorText}`);
      }

      // Update local cache
      this.cachedReservations = this.cachedReservations.filter(r => r.reservation_id !== reservationId);
    } catch (error) {
      console.error('❌ Error deleting reservation via API:', error);
      throw error;
    }
  }

  // Get reservations for a specific date
  async getReservationsForDate(date: string): Promise<ReservationRecord[]> {
    const reservations = await this.getReservations();
    return reservations.filter(r => r.date === date);
  }

  // Get reservations for a specific user
  async getReservationsForUser(userId: string): Promise<ReservationRecord[]> {
    const reservations = await this.getReservations();
    return reservations.filter(r => r.user_id === userId);
  }
}

// Singleton instance
export const vercelDataService = new VercelDataService();