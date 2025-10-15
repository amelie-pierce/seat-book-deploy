import { NextRequest, NextResponse } from 'next/server';

// User interface for type safety
export interface User {
  user_id: string;
  email: string;
}

// In-memory storage with default users (from original users.csv)
const inMemoryUsers: User[] = [
  { user_id: '1234', email: 'dhuynh@strongtie.com' },
  { user_id: 'U001', email: 'alice@mail.com' },
  { user_id: 'U002', email: 'bob@mail.com' },
  { user_id: 'U003', email: 'charlie@mail.com' },
  { user_id: 'U004', email: 'hvu@strongtie.com' }
];

export async function GET() {
  try {
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
