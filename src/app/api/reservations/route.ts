
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabase';
import { ReservationRecord } from '../../../utils/bookingStorage';

export async function GET() {
  try {
    const { data, error } = await supabase.from('reservations').select('*');
    if (error) {
      throw error;
    }
    return NextResponse.json({
      success: true,
      reservations: data || [],
      count: data ? data.length : 0
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

    // Conflict detection: check for existing reservation for same seat/date/slot
    const { data: existing, error: conflictError } = await supabase
      .from('reservations')
      .select('*')
      .eq('table_id', reservation.table_id)
      .eq('date', reservation.date)
      .eq('slot_type', reservation.slot_type)
      .neq('user_id', reservation.user_id)
      .neq('reservation_id', reservation.reservation_id);

    if (conflictError) {
      throw conflictError;
    }
    if (existing && existing.length > 0) {
      const conflictingReservation = existing[0];
      return NextResponse.json({
        success: false,
        error: 'SEAT_ALREADY_BOOKED',
        message: 'This seat is already booked by another user',
        conflictDetails: {
          seat: reservation.table_id,
          date: reservation.date,
          timeSlot: reservation.slot_type,
          bookedBy: conflictingReservation.user_id
        }
      }, { status: 409 });
    }

    // Upsert reservation (insert only, not update)
    const { error } = await supabase
      .from('reservations')
      .upsert([reservation], { onConflict: 'reservation_id' });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      reservation,
      totalCount: 1
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
    // Delete reservation from Supabase
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('reservation_id', reservationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Reservation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to delete reservation: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
