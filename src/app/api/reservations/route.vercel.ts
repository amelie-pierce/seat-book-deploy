import { NextRequest, NextResponse } from 'next/server';
import { ReservationRecord } from '../../../utils/bookingStorage';

// In-memory storage for Vercel deployment (persists during function lifetime)
// This will reset between cold starts but that's acceptable for demo purposes
const inMemoryReservations: ReservationRecord[] = [];

export async function GET() {
  try {
    console.log(`📊 GET /api/reservations - returning ${inMemoryReservations.length} reservations`);
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
    
    if (!reservation || !reservation.reservation_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid reservation data' 
      }, { status: 400 });
    }
    
    // Add or update the reservation in memory
    const existingIndex = inMemoryReservations.findIndex(r => r.reservation_id === reservation.reservation_id);
    if (existingIndex >= 0) {
      inMemoryReservations[existingIndex] = reservation;
      console.log(`✅ Reservation updated in memory: ${reservation.reservation_id}`);
    } else {
      inMemoryReservations.push(reservation);
      console.log(`✅ Reservation added to memory: ${reservation.reservation_id}`);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Reservation saved successfully',
      reservationId: reservation.reservation_id 
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
    const body = await request.json();
    const { reservation_id: reservationId } = body;
    
    if (!reservationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Reservation ID is required' 
      }, { status: 400 });
    }
    
    // Remove the reservation from memory
    const index = inMemoryReservations.findIndex(r => r.reservation_id === reservationId);
    
    if (index === -1) {
      return NextResponse.json({ 
        success: false, 
        error: 'Reservation not found' 
      }, { status: 404 });
    }
    
    inMemoryReservations.splice(index, 1);
    
    console.log(`✅ Reservation deleted from memory: ${reservationId}`);
    return NextResponse.json({ 
      success: true, 
      message: 'Reservation deleted successfully',
      deletedId: reservationId 
    });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete reservation' 
    }, { status: 500 });
  }
}