import { NextRequest, NextResponse } from 'next/server';
import { ReservationRecord } from '../../../utils/bookingStorage';

// In-memory storage for Vercel deployment (persists during function lifetime)
// This will reset between cold starts but that's acceptable for demo purposes
const inMemoryReservations: ReservationRecord[] = [];

export async function GET() {
  try {
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
    const initialCount = inMemoryReservations.length;
    const updatedReservations = inMemoryReservations.filter(r => r.reservation_id !== reservationId);
    
    if (updatedReservations.length === initialCount) {
      console.log(`❌ Reservation ${reservationId} not found`);
      return NextResponse.json({ 
        success: false, 
        error: 'Reservation not found' 
      }, { status: 404 });
    }
    
    // Update the in-memory array
    inMemoryReservations.splice(0, inMemoryReservations.length, ...updatedReservations);
    
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
