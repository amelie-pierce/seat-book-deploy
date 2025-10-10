// Booking data management with CSV storage
// This module handles reading/writing booking data to CSV files

export interface User {
  user_id: string;
  email: string;
}

export interface ReservationRecord {
  reservation_id: string;
  user_id: string;
  table_id: string;
  date: string;
  slot_type: 'AM' | 'PM' | 'FULL_DAY';
  created_at: string;
}

export interface BookingRecord {
  id: string;                    // Unique booking ID
  userId: string;                // User identifier
  seatId: string;                // Seat identifier (e.g., "A1", "B3")
  date: string;                  // Booking date (YYYY-MM-DD format)
  timeSlot: 'AM' | 'PM' | 'FULL_DAY'; // Time slot
  bookingTimestamp: string;      // When the booking was made (ISO string)
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED'; // Booking status
  userEmail?: string;            // Optional: user email for notifications
  userName?: string;             // Optional: user display name
  specialRequests?: string;      // Optional: special requests or notes
  tableNumber?: string;          // Optional: derived table letter (e.g., "A", "B")
  contactPhone?: string;         // Optional: contact phone number
  modifiedTimestamp?: string;    // Optional: last modification timestamp
  modifiedBy?: string;           // Optional: who modified the booking
}

// CSV header structure - add new fields at the end for backward compatibility
export const CSV_HEADERS = [
  'id',
  'userId', 
  'seatId',
  'date',
  'timeSlot',
  'bookingTimestamp',
  'status',
  'userEmail',
  'userName',
  'specialRequests',
  'tableNumber',
  'contactPhone',
  'modifiedTimestamp',
  'modifiedBy'
] as const;

// Reservation CSV headers (for external data files)
export const RESERVATION_CSV_HEADERS = [
  'reservation_id',
  'user_id',
  'table_id',
  'date',
  'slot_type',
  'created_at'
] as const;

// User CSV headers (for external data files)
export const USER_CSV_HEADERS = [
  'user_id',
  'email'
] as const;

// Generate unique booking ID
export const generateBookingId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `BOOK_${timestamp}_${random}`.toUpperCase();
};

// Convert booking record to CSV row
export const bookingToCsvRow = (booking: BookingRecord): string => {
  const values = CSV_HEADERS.map(header => {
    const value = booking[header as keyof BookingRecord] || '';
    // Escape quotes and wrap in quotes if contains comma
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  });
  return values.join(',');
};

// Convert CSV row to booking record
export const csvRowToBooking = (csvRow: string): BookingRecord | null => {
  try {
    // Simple CSV parsing - in production, use a proper CSV parser
    const values = parseCsvRow(csvRow);
    if (values.length < CSV_HEADERS.length) {
      return null;
    }

    const booking: BookingRecord = {
      id: values[0] || '',
      userId: values[1] || '',
      seatId: values[2] || '',
      date: values[3] || '',
      timeSlot: (values[4] as 'AM' | 'PM' | 'FULL_DAY') || 'AM',
      bookingTimestamp: values[5] || '',
      status: (values[6] as 'ACTIVE' | 'CANCELLED' | 'COMPLETED') || 'ACTIVE',
      userEmail: values[7] || undefined,
      userName: values[8] || undefined,
      specialRequests: values[9] || undefined,
      tableNumber: values[10] || undefined,
      contactPhone: values[11] || undefined,
      modifiedTimestamp: values[12] || undefined,
      modifiedBy: values[13] || undefined,
    };

    return booking;
  } catch (error) {
    console.error('Error parsing CSV row:', error);
    return null;
  }
};

// Simple CSV row parser (handles quoted values)
const parseCsvRow = (row: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values;
};

// Create CSV content from booking records
export const createCsvContent = (bookings: BookingRecord[]): string => {
  const headerRow = CSV_HEADERS.join(',');
  const dataRows = bookings.map(bookingToCsvRow);
  return [headerRow, ...dataRows].join('\n');
};

// Parse CSV content to booking records
export const parseCsvContent = (csvContent: string): BookingRecord[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Skip header row
  const dataLines = lines.slice(1);
  return dataLines
    .map(csvRowToBooking)
    .filter((booking): booking is BookingRecord => booking !== null);
};

// Check if user already has a booking for the given date
export const hasUserBookingForDate = (bookings: BookingRecord[], userId: string, date: string): boolean => {
  return bookings.some(booking => 
    booking.userId === userId && 
    booking.date === date && 
    booking.status === 'ACTIVE'
  );
};

// Get user's booking for a specific date
export const getUserBookingForDate = (bookings: BookingRecord[], userId: string, date: string): BookingRecord | null => {
  return bookings.find(booking => 
    booking.userId === userId && 
    booking.date === date && 
    booking.status === 'ACTIVE'
  ) || null;
};

// Get all bookings for a specific date
export const getBookingsForDate = (bookings: BookingRecord[], date: string): BookingRecord[] => {
  return bookings.filter(booking => 
    booking.date === date && 
    booking.status === 'ACTIVE'
  );
};

// Get reserved seats for a specific date
export const getReservedSeatsForDate = (bookings: BookingRecord[], date: string): string[] => {
  return getBookingsForDate(bookings, date).map(booking => booking.seatId);
};

// Format date as YYYY-MM-DD
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Get today's date in YYYY-MM-DD format
export const getTodayDate = (): string => {
  return formatDate(new Date());
};

// Convert ReservationRecord to BookingRecord
export const reservationToBooking = (reservation: ReservationRecord, userEmail?: string): BookingRecord => {
  // The table_id in CSV can be either seat format (A1, B2) or table format (T01, T02)
  // If it's table format, we need to convert it back to seat format
  let seatId = reservation.table_id;
  let tableNumber = 'A'; // default
  
  if (reservation.table_id.startsWith('T')) {
    // Handle old table format like T01, T02, T03
    const tableNum = parseInt(reservation.table_id.slice(1));
    tableNumber = String.fromCharCode(65 + (tableNum - 1)); // T01->A, T02->B, T03->C
    seatId = `${tableNumber}1`; // Default to seat 1 for table format
  } else {
    // Handle seat format like A1, B2
    tableNumber = reservation.table_id.charAt(0);
  }
  
  return {
    id: reservation.reservation_id,
    userId: reservation.user_id,
    seatId: seatId,
    date: reservation.date,
    timeSlot: reservation.slot_type,
    bookingTimestamp: reservation.created_at,
    status: 'ACTIVE',
    userEmail: userEmail,
    tableNumber: tableNumber,
  };
};

// Convert BookingRecord to ReservationRecord
export const bookingToReservation = (booking: BookingRecord): ReservationRecord => {
  return {
    reservation_id: booking.id,
    user_id: booking.userId,
    table_id: booking.seatId, // Store seat ID (A1, B2, etc.) in table_id field
    date: booking.date,
    slot_type: booking.timeSlot,
    created_at: booking.bookingTimestamp,
  };
};

// Parse CSV content for users
export const parseUsersCsvContent = (csvContent: string): User[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Skip header row
  const dataLines = lines.slice(1);
  return dataLines.map(line => {
    const [user_id, email] = line.split(',').map(field => field.trim());
    return { user_id, email };
  }).filter(user => user.user_id && user.email);
};

// Parse CSV content for reservations
export const parseReservationsCsvContent = (csvContent: string): ReservationRecord[] => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Skip header row
  const dataLines = lines.slice(1);
  return dataLines.map(line => {
    const values = parseCsvRow(line);
    if (values.length < 6) return null;
    
    return {
      reservation_id: values[0] || '',
      user_id: values[1] || '',
      table_id: values[2] || '',
      date: values[3] || '',
      slot_type: (values[4] as 'AM' | 'PM' | 'FULL_DAY') || 'AM',
      created_at: values[5] || '',
    };
  }).filter((reservation): reservation is ReservationRecord => reservation !== null);
};

// Create CSV content for users
export const createUsersCsvContent = (users: User[]): string => {
  const headerRow = USER_CSV_HEADERS.join(',');
  const dataRows = users.map(user => `${user.user_id},${user.email}`);
  return [headerRow, ...dataRows].join('\n');
};

// Create CSV content for reservations
export const createReservationsCsvContent = (reservations: ReservationRecord[]): string => {
  const headerRow = RESERVATION_CSV_HEADERS.join(',');
  const dataRows = reservations.map(reservation => {
    return [
      reservation.reservation_id,
      reservation.user_id,
      reservation.table_id,
      reservation.date,
      reservation.slot_type,
      reservation.created_at
    ].join(',');
  });
  return [headerRow, ...dataRows].join('\n');
};
