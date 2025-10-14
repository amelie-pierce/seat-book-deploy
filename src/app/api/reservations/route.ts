import { NextRequest, NextResponse } from 'next/server';
import { ReservationRecord } from '../../../utils/bookingStorage';
import { promises as fs } from 'fs';
import path from 'path';

// File path for persistent storage (Vercel allows /tmp directory writes)
const TEMP_FILE_PATH = path.join('/tmp', 'reservations.json');

// In-memory cache for performance
let inMemoryReservations: ReservationRecord[] = [];
let isLoaded = false;

// Load reservations from persistent storage
async function loadReservations(): Promise<void> {
  if (isLoaded) return;
  
  try {
    const data = await fs.readFile(TEMP_FILE_PATH, 'utf-8');
    inMemoryReservations = JSON.parse(data);
    console.log(`📂 Loaded ${inMemoryReservations.length} reservations from persistent storage`);
  } catch {
    // File doesn't exist or is corrupted, start with empty array
    console.log('📂 No existing reservations file, starting fresh');
    inMemoryReservations = [];
  }
  isLoaded = true;
}

// Save reservations to persistent storage
async function saveReservations(): Promise<void> {
  try {
    await fs.writeFile(TEMP_FILE_PATH, JSON.stringify(inMemoryReservations, null, 2));
    console.log(`💾 Saved ${inMemoryReservations.length} reservations to persistent storage`);
  } catch (error) {
    console.error('❌ Error saving reservations:', error);
  }
}

export async function GET() {
  try {
    await loadReservations();
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
    await loadReservations();
    const { reservation }: { reservation: ReservationRecord } = await request.json();
    console.log('📝 POST /api/reservations - Adding reservation:', reservation);

    // Check if reservation already exists (update) or is new
    const existingIndex = inMemoryReservations.findIndex(r => r.reservation_id === reservation.reservation_id);
    
    if (existingIndex >= 0) {
      inMemoryReservations[existingIndex] = reservation;
      console.log(`🔄 Updated existing reservation ${reservation.reservation_id}`);
    } else {
      inMemoryReservations.push(reservation);
      console.log(`➕ Added new reservation ${reservation.reservation_id}`);
    }

    await saveReservations();
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
    await loadReservations();
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
    
    await saveReservations();
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
      error: 'Failed to delete reservation' 
    }, { status: 500 });
  }
}
