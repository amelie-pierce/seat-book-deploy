// Vercel-compatible data service using API endpoints and in-memory storage
// This service replaces CSV file operations with API calls for Vercel deployment

import { 
  User, 
  ReservationRecord, 
  BookingRecord,
  reservationToBooking,
  bookingToReservation
} from '../utils/bookingStorage';

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
    console.log('🔍 initialize() called from:', new Error().stack?.split('\n')[2]?.trim());
    console.log('🔍 React StrictMode detected:', typeof window !== 'undefined' && window.React && window.React.version);
    
    if (this.isInitialized) {
      console.log('📊 Vercel service already initialized - skipping API call');
      return;
    }

    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      console.log('⏳ Initialization already in progress - waiting...');
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
      console.log('📊 Initializing Vercel data service...');
      
      // Load initial data from API endpoints
      await this.loadFromApi();
      
      this.isInitialized = true;
      console.log(`📊 Vercel service initialized with ${this.cachedUsers.length} users and ${this.cachedReservations.length} reservations`);
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
    
    // Add stack trace to see WHO is calling this
    console.log('🔍 loadFromApi() called from:', new Error().stack?.split('\n')[2]?.trim());
    
    // Check if we recently loaded data (within cache duration)
    if (this.isInitialized && (now - this.lastApiCall) < this.CACHE_DURATION) {
      console.log(`⚡ Using cached data (${Math.round((now - this.lastApiCall)/1000)}s old) - skipping API call`);
      return;
    }

    try {
      console.log('📡 Making API calls to load fresh data...');
      
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
      console.log('📄 Loaded fresh data from API endpoints');
      console.log(`👥 Loaded ${this.cachedUsers.length} users`);
      console.log(`🎫 Loaded ${this.cachedReservations.length} reservations`);
    } catch (error) {
      console.error('❌ Error loading from API endpoints:', error);
      console.log('ℹ️ Starting with empty data - this is normal for first deployment');
      
      // Initialize with empty data instead of throwing error
      this.cachedUsers = [];
      this.cachedReservations = [];
    }
  }

  // Refresh data by re-reading from API (forces fresh API call)
  async refreshFromApi(): Promise<void> {
    console.log('🔄 Force refreshing data from API...');
    // Reset timestamp to force fresh API call
    this.lastApiCall = 0;
    await this.loadFromApi();
    console.log(`🔄 Data refreshed: ${this.cachedUsers.length} users, ${this.cachedReservations.length} reservations`);
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
    console.log(`🔍 Looking for user: "${userId}"`);
    console.log(`📋 Available users:`, this.cachedUsers.map(u => u.user_id));
    const foundUser = this.cachedUsers.find(user => user.user_id === userId) || null;
    console.log(`${foundUser ? '✅' : '❌'} User ${userId} ${foundUser ? 'found' : 'not found'}`);
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

      console.log(`✅ User saved via API: ${user.user_id}`);
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

  // Save booking as reservation via API
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

      if (!response.ok) {
        throw new Error(`Failed to save reservation: ${response.status}`);
      }

      // Update local cache
      const existingIndex = this.cachedReservations.findIndex(r => r.reservation_id === reservation.reservation_id);
      if (existingIndex >= 0) {
        this.cachedReservations[existingIndex] = reservation;
      } else {
        this.cachedReservations.push(reservation);
      }

      console.log(`✅ Reservation saved via API: ${reservation.reservation_id}`);
    } catch (error) {
      console.error('❌ Error saving reservation via API:', error);
      throw error;
    }
  }

  // Delete reservation via API
  async deleteReservation(reservationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reservations`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservation_id: reservationId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete reservation: ${response.status}`);
      }

      // Update local cache
      this.cachedReservations = this.cachedReservations.filter(r => r.reservation_id !== reservationId);

      console.log(`✅ Reservation deleted via API: ${reservationId}`);
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