import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { User, parseUsersCsvContent, createUsersCsvContent } from '../../../utils/bookingStorage';

const CSV_FILE_PATH = path.join(process.cwd(), 'public', 'users.csv');

export async function GET() {
  try {
    const csvContent = await fs.readFile(CSV_FILE_PATH, 'utf-8');
    const users = parseUsersCsvContent(csvContent);
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Error reading users CSV:', error);
    return NextResponse.json({ success: false, error: 'Failed to read users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user }: { user: User } = await request.json();
    
    // Read current CSV content
    const csvContent = await fs.readFile(CSV_FILE_PATH, 'utf-8');
    const existingUsers = parseUsersCsvContent(csvContent);
    
    // Add or update the user
    const existingIndex = existingUsers.findIndex(u => u.user_id === user.user_id);
    if (existingIndex >= 0) {
      existingUsers[existingIndex] = user;
    } else {
      existingUsers.push(user);
    }
    
    // Write back to CSV file
    const newCsvContent = createUsersCsvContent(existingUsers);
    await fs.writeFile(CSV_FILE_PATH, newCsvContent, 'utf-8');
    
    console.log(`✅ User saved to CSV file: ${user.user_id}`);
    return NextResponse.json({ success: true, message: 'User saved successfully' });
  } catch (error) {
    console.error('Error saving user to CSV:', error);
    return NextResponse.json({ success: false, error: 'Failed to save user' }, { status: 500 });
  }
}
