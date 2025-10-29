import { NextRequest, NextResponse } from 'next/server';
import { ReservationRecord, parseReservationsCsvContent } from '../../../utils/bookingStorage';

// In-memory storage for deployment (persists during server lifetime)
let inMemoryReservations: ReservationRecord[] = [];
let isInitialized = false;

// Initialize in-memory storage from CSV file if available (development only)
async function initializeFromCsv() {
  if (isInitialized) return;
  
  try {
    // Only load from CSV in development or when CSV files are accessible
    // In production (Vercel), this will use fetch to load the CSV
    const response = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : ''}/reservations.csv`);
    
    if (response.ok) {
      const csvContent = await response.text();
      inMemoryReservations = parseReservationsCsvContent(csvContent);
      console.log(`📊 Loaded ${inMemoryReservations.length} reservations from CSV file`);
    } else {
      console.log('⚠️ No reservations.csv found, starting with empty data');
      inMemoryReservations = [];
    }
  } catch {
    console.log('⚠️ Could not load CSV (normal for Vercel deployments), starting with empty data');
    inMemoryReservations = [];
  }
  
  isInitialized = true;
}

export async function GET() {
  try {
    await initializeFromCsv();
    
    return NextResponse.json({ 
      success: true, 
      reservations: inMemoryReservations,
      count: inMemoryReservations.length 
    });
  } catch (error) {
    console.error('Error getting reservations:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get reservations' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeFromCsv();
    
    const { reservation }: { reservation: ReservationRecord } = await request.json();

    // 🛡️ CONFLICT DETECTION: Check if another user already booked this seat+date+timeslot
    const conflictingReservation = inMemoryReservations.find(r => 
      r.table_id === reservation.table_id &&
      r.date === reservation.date &&
      r.slot_type === reservation.slot_type &&
      r.user_id !== reservation.user_id &&  // Different user
      r.reservation_id !== reservation.reservation_id // Different reservation
    );

    if (conflictingReservation) {
      console.log(`❌ CONFLICT: Seat ${reservation.table_id} on ${reservation.date} (${reservation.slot_type}) already booked by user ${conflictingReservation.user_id}`);
      return NextResponse.json({ 
        success: false, 
        error: 'SEAT_ALREADY_BOOKED',
        message: `This seat is already booked by another user`,
        conflictDetails: {
          seat: reservation.table_id,
          date: reservation.date,
          timeSlot: reservation.slot_type,
          bookedBy: conflictingReservation.user_id
        }
      }, { status: 409 }); // 409 Conflict
    }

    // Check if this user's reservation already exists (update scenario)
    const existingIndex = inMemoryReservations.findIndex(r => r.reservation_id === reservation.reservation_id);
    
    if (existingIndex >= 0) {
      inMemoryReservations[existingIndex] = reservation;
      console.log(`🔄 Updated existing reservation ${reservation.reservation_id}`);
    } else {
      inMemoryReservations.push(reservation);
      console.log(`➕ Added new reservation ${reservation.reservation_id}`);
    }

    console.log(`✅ Reservation ${reservation.reservation_id} saved successfully. Total reservations: ${inMemoryReservations.length}`);
    
    return NextResponse.json({ 
      success: true, 
      reservation,
      totalCount: inMemoryReservations.length 
    });
  } catch (error) {
    console.error('Error saving reservation:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save reservation' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await initializeFromCsv();
    
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('id');
    
    if (!reservationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Reservation ID is required' 
      }, { status: 400 });
    }
    
    console.log(`🗑️ DELETE /api/reservations - Deleting reservation: ${reservationId}`);
    
    // Remove the reservation from memory
    const indexToDelete = inMemoryReservations.findIndex(r => r.reservation_id === reservationId);
    
    if (indexToDelete === -1) {
      console.log(`❌ Reservation ${reservationId} not found`);
      return NextResponse.json({ 
        success: false, 
        error: 'Reservation not found' 
      }, { status: 404 });
    }
    
    // Remove the reservation
    inMemoryReservations.splice(indexToDelete, 1);
    
    console.log(`✅ Reservation ${reservationId} deleted successfully. Remaining: ${inMemoryReservations.length}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Reservation deleted successfully',
      totalCount: inMemoryReservations.length 
    });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Failed to delete reservation: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
