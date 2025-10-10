// CSV Data Service for managing external CSV files
// This service handles loading and saving data from/to CSV files

import { 
  User, 
  ReservationRecord, 
  BookingRecord,
  parseUsersCsvContent,
  parseReservationsCsvContent,
  createUsersCsvContent,
  createReservationsCsvContent,
  reservationToBooking,
  bookingToReservation
} from '../utils/bookingStorage';

export class CsvDataService {
  private cachedUsers: User[] = [];
  private cachedReservations: ReservationRecord[] = [];
  private isInitialized = false;

  // Initialize service by loading CSV data
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📊 Initializing CSV data service...');
      
      // Load initial data from CSV files
      await this.loadFromCsvFiles();
      
      this.isInitialized = true;
      console.log(`📊 CSV service initialized with ${this.cachedUsers.length} users and ${this.cachedReservations.length} reservations`);
    } catch (error) {
      console.error('❌ Error initializing CSV service:', error);
      this.cachedUsers = [];
      this.cachedReservations = [];
      this.isInitialized = true;
    }
  }

  // Load data directly from CSV files in public folder
  private async loadFromCsvFiles(): Promise<void> {
    try {
      // Load users.csv from public folder
      const usersResponse = await fetch('/users.csv');
      if (!usersResponse.ok) {
        throw new Error(`Failed to load users.csv: ${usersResponse.status}`);
      }
      const usersData = await usersResponse.text();

      // Load reservations.csv from public folder
      const reservationsResponse = await fetch('/reservations.csv');
      if (!reservationsResponse.ok) {
        throw new Error(`Failed to load reservations.csv: ${reservationsResponse.status}`);
      }
      const reservationsData = await reservationsResponse.text();

      // Parse the CSV data
      this.cachedUsers = parseUsersCsvContent(usersData);
      this.cachedReservations = parseReservationsCsvContent(reservationsData);

      console.log('📄 Loaded data from CSV files in public folder');
      console.log(`👥 Loaded ${this.cachedUsers.length} users`);
      console.log(`🎫 Loaded ${this.cachedReservations.length} reservations`);
    } catch (error) {
      console.error('❌ Error loading from CSV files:', error);
      console.error('❌ CSV files are required for the application to work');
      
      // Redirect to 404 page since CSV files are required
      if (typeof window !== 'undefined') {
        window.location.href = '/404';
      }
      
      throw new Error('Required CSV files could not be loaded');
    }
  }

  // Refresh data by re-reading from CSV files
  async refreshFromCsvFiles(): Promise<void> {
    console.log('� Refreshing data from CSV files...');
    await this.loadFromCsvFiles();
    console.log(`🔄 Data refreshed: ${this.cachedUsers.length} users, ${this.cachedReservations.length} reservations`);
  }

  // Get all users
  async getUsers(): Promise<User[]> {
    await this.initialize();
    return [...this.cachedUsers];
  }

  // Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    await this.initialize();
    return this.cachedUsers.find(user => user.user_id === userId) || null;
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    await this.initialize();
    return this.cachedUsers.find(user => user.email === email) || null;
  }

  // Add or update user
  async saveUser(user: User): Promise<void> {
    await this.initialize();
    
    const existingIndex = this.cachedUsers.findIndex(u => u.user_id === user.user_id);
    if (existingIndex >= 0) {
      this.cachedUsers[existingIndex] = user;
    } else {
      this.cachedUsers.push(user);
    }

    // Save to CSV file via API route
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save user: ${response.status}`);
      }
      
      console.log(`👤 User saved to CSV file: ${user.user_id}`);
    } catch (error) {
      console.error('Error saving user to CSV file:', error);
      throw error;
    }
  }

  // Get all reservations
  async getReservations(): Promise<ReservationRecord[]> {
    await this.initialize();
    return [...this.cachedReservations];
  }

  // Get reservations for a specific user
  async getUserReservations(userId: string): Promise<ReservationRecord[]> {
    await this.initialize();
    return this.cachedReservations.filter(res => res.user_id === userId);
  }

  // Get reservations for a specific date
  async getReservationsForDate(date: string): Promise<ReservationRecord[]> {
    await this.initialize();
    return this.cachedReservations.filter(res => res.date === date);
  }

  // Add new reservation
  async saveReservation(reservation: ReservationRecord): Promise<void> {
    await this.initialize();
    
    const existingIndex = this.cachedReservations.findIndex(r => r.reservation_id === reservation.reservation_id);
    if (existingIndex >= 0) {
      this.cachedReservations[existingIndex] = reservation;
    } else {
      this.cachedReservations.push(reservation);
    }

    // Save to CSV file via API route
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save reservation: ${response.status}`);
      }
      
      console.log(`🎫 Reservation saved to CSV file: ${reservation.reservation_id}`);
    } catch (error) {
      console.error('Error saving reservation to CSV file:', error);
      throw error;
    }
  }

  // Delete reservation
  async deleteReservation(reservationId: string): Promise<boolean> {
    await this.initialize();
    
    const index = this.cachedReservations.findIndex(r => r.reservation_id === reservationId);
    if (index >= 0) {
      this.cachedReservations.splice(index, 1);
      
      // Delete from CSV file via API route
      try {
        const response = await fetch(`/api/reservations?id=${reservationId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete reservation: ${response.status}`);
        }
        
        console.log(`🗑️ Reservation deleted from CSV file: ${reservationId}`);
        return true;
      } catch (error) {
        console.error('Error deleting reservation from CSV file:', error);
        throw error;
      }
    }
    return false;
  }

  // Convert reservations to bookings format
  async getBookingsFromReservations(): Promise<BookingRecord[]> {
    await this.initialize();
    
    const bookings: BookingRecord[] = [];
    for (const reservation of this.cachedReservations) {
      const user = await this.getUserById(reservation.user_id);
      const booking = reservationToBooking(reservation, user?.email);
      bookings.push(booking);
    }
    
    return bookings;
  }

  // Save booking as reservation
  async saveBookingAsReservation(booking: BookingRecord): Promise<void> {
    const reservation = bookingToReservation(booking);
    await this.saveReservation(reservation);
  }

  // Export methods for data management
  async exportUsersAsCsv(): Promise<string> {
    await this.initialize();
    return createUsersCsvContent(this.cachedUsers);
  }

  async exportReservationsAsCsv(): Promise<string> {
    await this.initialize();
    return createReservationsCsvContent(this.cachedReservations);
  }

  // Import methods
  async importUsers(csvContent: string): Promise<{ success: boolean; imported: number; error?: string }> {
    try {
      const users = parseUsersCsvContent(csvContent);
      const existingIds = new Set(this.cachedUsers.map(u => u.user_id));
      const newUsers = users.filter(u => !existingIds.has(u.user_id));
      
      this.cachedUsers.push(...newUsers);
      // In a real application, this would write back to the CSV file
      
      return { success: true, imported: newUsers.length };
    } catch (error) {
      console.error('Error importing users:', error);
      return { success: false, imported: 0, error: 'Failed to import users' };
    }
  }

  async importReservations(csvContent: string): Promise<{ success: boolean; imported: number; error?: string }> {
    try {
      const reservations = parseReservationsCsvContent(csvContent);
      const existingIds = new Set(this.cachedReservations.map(r => r.reservation_id));
      const newReservations = reservations.filter(r => !existingIds.has(r.reservation_id));
      
      this.cachedReservations.push(...newReservations);
      // In a real application, this would write back to the CSV file
      
      return { success: true, imported: newReservations.length };
    } catch (error) {
      console.error('Error importing reservations:', error);
      return { success: false, imported: 0, error: 'Failed to import reservations' };
    }
  }

  // Get statistics
  async getStats(): Promise<{
    totalUsers: number;
    totalReservations: number;
    activeReservations: number;
    todayReservations: number;
  }> {
    await this.initialize();
    const today = new Date().toISOString().split('T')[0];
    
    return {
      totalUsers: this.cachedUsers.length,
      totalReservations: this.cachedReservations.length,
      activeReservations: this.cachedReservations.length, // All reservations are considered active in CSV
      todayReservations: this.cachedReservations.filter(r => r.date === today).length,
    };
  }
}

// Singleton instance
export const csvDataService = new CsvDataService();
