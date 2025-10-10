import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ReservationRecord, parseReservationsCsvContent, createReservationsCsvContent } from '../../../utils/bookingStorage';

const CSV_FILE_PATH = path.join(process.cwd(), 'public', 'reservations.csv');

export async function GET() {
  try {
    const csvContent = await fs.readFile(CSV_FILE_PATH, 'utf-8');
    const reservations = parseReservationsCsvContent(csvContent);
    return NextResponse.json({ success: true, reservations });
  } catch (error) {
    console.error('Error reading reservations CSV:', error);
    return NextResponse.json({ success: false, error: 'Failed to read reservations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { reservation }: { reservation: ReservationRecord } = await request.json();
    
    // Read current CSV content
    const csvContent = await fs.readFile(CSV_FILE_PATH, 'utf-8');
    const existingReservations = parseReservationsCsvContent(csvContent);
    
    // Add or update the reservation
    const existingIndex = existingReservations.findIndex(r => r.reservation_id === reservation.reservation_id);
    if (existingIndex >= 0) {
      existingReservations[existingIndex] = reservation;
    } else {
      existingReservations.push(reservation);
    }
    
    // Write back to CSV file
    const newCsvContent = createReservationsCsvContent(existingReservations);
    await fs.writeFile(CSV_FILE_PATH, newCsvContent, 'utf-8');
    
    console.log(`✅ Reservation saved to CSV file: ${reservation.reservation_id}`);
    return NextResponse.json({ success: true, message: 'Reservation saved successfully' });
  } catch (error) {
    console.error('Error saving reservation to CSV:', error);
    return NextResponse.json({ success: false, error: 'Failed to save reservation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('id');
    
    if (!reservationId) {
      return NextResponse.json({ success: false, error: 'Reservation ID is required' }, { status: 400 });
    }
    
    // Read current CSV content
    const csvContent = await fs.readFile(CSV_FILE_PATH, 'utf-8');
    const existingReservations = parseReservationsCsvContent(csvContent);
    
    // Remove the reservation
    const filteredReservations = existingReservations.filter(r => r.reservation_id !== reservationId);
    
    if (filteredReservations.length === existingReservations.length) {
      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 });
    }
    
    // Write back to CSV file
    const newCsvContent = createReservationsCsvContent(filteredReservations);
    await fs.writeFile(CSV_FILE_PATH, newCsvContent, 'utf-8');
    
    console.log(`🗑️ Reservation deleted from CSV file: ${reservationId}`);
    return NextResponse.json({ success: true, message: 'Reservation deleted successfully' });
  } catch (error) {
    console.error('Error deleting reservation from CSV:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete reservation' }, { status: 500 });
  }
}
