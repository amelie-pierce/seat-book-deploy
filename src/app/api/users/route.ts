import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// User interface for type safety
export interface User {
  user_id: string;
  email: string;
}

// File path for persistent storage (Vercel allows /tmp directory writes)
const TEMP_FILE_PATH = path.join('/tmp', 'users.json');

// Default users (from original users.csv)
const DEFAULT_USERS: User[] = [
  { user_id: '1234', email: 'dhuynh@strongtie.com' },
  { user_id: 'U001', email: 'alice@mail.com' },
  { user_id: 'U002', email: 'bob@mail.com' },
  { user_id: 'U003', email: 'charlie@mail.com' },
  { user_id: 'U004', email: 'hvu@strongtie.com' }
];

// In-memory cache for performance
let inMemoryUsers: User[] = [];
let isLoaded = false;

// Load users from persistent storage
async function loadUsers(): Promise<void> {
  if (isLoaded) return;
  
  try {
    const data = await fs.readFile(TEMP_FILE_PATH, 'utf-8');
    inMemoryUsers = JSON.parse(data);
    console.log(`👥 Loaded ${inMemoryUsers.length} users from persistent storage`);
  } catch {
    // File doesn't exist or is corrupted, start with default users
    console.log('👥 No existing users file, starting with default users');
    inMemoryUsers = [...DEFAULT_USERS];
    await saveUsers(); // Save the default users to persistence
  }
  isLoaded = true;
}

// Save users to persistent storage
async function saveUsers(): Promise<void> {
  try {
    await fs.writeFile(TEMP_FILE_PATH, JSON.stringify(inMemoryUsers, null, 2));
    console.log(`💾 Saved ${inMemoryUsers.length} users to persistent storage`);
  } catch (error) {
    console.error('❌ Error saving users:', error);
  }
}

export async function GET() {
  try {
    await loadUsers();
    console.log(`👥 GET /api/users - returning ${inMemoryUsers.length} users`);
    return NextResponse.json({ 
      success: true, 
      users: inMemoryUsers,
      count: inMemoryUsers.length 
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get users' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await loadUsers();
    const { user }: { user: User } = await request.json();
    console.log('👤 POST /api/users - Adding user:', user);
    
    // Check if user already exists (update) or is new
    const existingIndex = inMemoryUsers.findIndex(u => u.user_id === user.user_id);
    
    if (existingIndex >= 0) {
      inMemoryUsers[existingIndex] = user;
      console.log(`🔄 Updated existing user ${user.user_id}`);
    } else {
      inMemoryUsers.push(user);
      console.log(`➕ Added new user ${user.user_id}`);
    }
    
    await saveUsers();
    console.log(`✅ User ${user.user_id} saved successfully. Total users: ${inMemoryUsers.length}`);
    return NextResponse.json({ 
      success: true, 
      user,
      totalCount: inMemoryUsers.length 
    });
  } catch (error) {
    console.error('Error saving user:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save user' 
    }, { status: 500 });
  }
}
