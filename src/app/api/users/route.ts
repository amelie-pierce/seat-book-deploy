import { NextRequest, NextResponse } from "next/server";
import { parseUsersCsvContent } from "../../../utils/bookingStorage";

// User interface for type safety
export interface User {
  user_id: string;
  email: string;
}

// In-memory storage - will be initialized from CSV if available
let inMemoryUsers: User[] = [];
let isInitialized = false;

// Initialize in-memory storage from CSV file if available
async function initializeFromCsv() {
  if (isInitialized) return;

  try {
    // Try to load from CSV file using fetch (works in both dev and production)
    const response = await fetch(
      `${
        process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : ""
      }/users.csv`
    );

    if (response.ok) {
      const csvContent = await response.text();
      inMemoryUsers = parseUsersCsvContent(csvContent);
      console.log(`👥 Loaded ${inMemoryUsers.length} users from CSV file`);
    } else {
      console.log("⚠️ No users.csv found, starting with default users");
      inMemoryUsers = [
        { user_id: "1234", email: "minnguyen@strongtie.com" },
        { user_id: "U001", email: "dhuynh@strongtie.com" },
        { user_id: "U002", email: "hvu@strongtie.com" },
        { user_id: "U003", email: "mtien@strongtie.com" },
        { user_id: "U004", email: "nghinguyen@strongtie.com" },
        { user_id: "U005", email: "tnguyen19@strongtie.com" },
        { user_id: "U006", email: "hoainguyen@strongtie.com" },
        { user_id: "U007", email: "tienguyen@strongtie.com" },
        { user_id: "U008", email: "quonguyen@strongtie.com" },
        { user_id: "U009", email: "thtruong@strongtie.com" },
        { user_id: "U010", email: "khdao@strongtie.com" },
      ];
    }
  } catch {
    console.log(
      "⚠️ Could not load CSV (normal for Vercel deployments), using default users"
    );
    inMemoryUsers = [
      { user_id: "1234", email: "minnguyen@strongtie.com" },
      { user_id: "U001", email: "dhuynh@strongtie.com" },
      { user_id: "U002", email: "hvu@strongtie.com" },
      { user_id: "U003", email: "mtien@strongtie.com" },
      { user_id: "U004", email: "nghinguyen@strongtie.com" },
      { user_id: "U005", email: "tnguyen19@strongtie.com" },
      { user_id: "U006", email: "hoainguyen@strongtie.com" },
      { user_id: "U007", email: "tienguyen@strongtie.com" },
      { user_id: "U008", email: "quonguyen@strongtie.com" },
      { user_id: "U009", email: "thtruong@strongtie.com" },
      { user_id: "U010", email: "khdao@strongtie.com" },
    ];
  }

  isInitialized = true;
}

export async function GET() {
  try {
    await initializeFromCsv();

    console.log(`👥 GET /api/users - returning ${inMemoryUsers.length} users`);
    return NextResponse.json({
      success: true,
      users: inMemoryUsers,
      count: inMemoryUsers.length,
    });
  } catch (error) {
    console.error("Error getting users:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get users",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeFromCsv();

    const { user }: { user: User } = await request.json();
    console.log("👤 POST /api/users - Adding user:", user);

    // Check if user already exists (update) or is new
    const existingIndex = inMemoryUsers.findIndex(
      (u) => u.user_id === user.user_id
    );

    if (existingIndex >= 0) {
      inMemoryUsers[existingIndex] = user;
      console.log(`🔄 Updated existing user ${user.user_id}`);
    } else {
      inMemoryUsers.push(user);
      console.log(`➕ Added new user ${user.user_id}`);
    }

    console.log(
      `✅ User ${user.user_id} saved successfully. Total users: ${inMemoryUsers.length}`
    );

    return NextResponse.json({
      success: true,
      user,
      totalCount: inMemoryUsers.length,
    });
  } catch (error) {
    console.error("Error saving user:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save user",
      },
      { status: 500 }
    );
  }
}
