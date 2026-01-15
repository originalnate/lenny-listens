import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

// Admin endpoint to clear test data from KV
export async function POST() {
  try {
    // Get all pending perspective IDs
    const pendingIds = await kv.lrange("pending_perspectives", 0, -1);

    let cleared = 0;

    // Remove any test entries
    for (const id of pendingIds) {
      if (typeof id === "string" && id.startsWith("test-")) {
        await kv.lrem("pending_perspectives", 0, id);
        await kv.del(`perspective:${id}`);
        cleared++;
      }
    }

    // Also clear the entire pending list if needed
    const remaining = await kv.lrange("pending_perspectives", 0, -1);

    return NextResponse.json({
      success: true,
      cleared,
      remaining: remaining.length,
    });
  } catch (error) {
    console.error("Error clearing test data:", error);
    return NextResponse.json(
      { error: "Failed to clear test data" },
      { status: 500 }
    );
  }
}
