import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { GeneratedPerspective } from "@/lib/lenny-methodology";

// GET endpoint to fetch the most recent pending perspective
export async function GET() {
  try {
    // Get the list of pending perspectives
    const pendingIds = await kv.lrange("pending_perspectives", 0, 10);

    if (!pendingIds || pendingIds.length === 0) {
      return NextResponse.json(
        { error: "No pending perspectives found" },
        { status: 404 }
      );
    }

    // Get the most recent one (first in the list since we lpush)
    const latestId = pendingIds[0];
    const perspective = await kv.get<GeneratedPerspective>(`perspective:${latestId}`);

    if (!perspective) {
      return NextResponse.json(
        { error: "Perspective not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(perspective);
  } catch (error) {
    console.error("Error fetching latest perspective:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest perspective" },
      { status: 500 }
    );
  }
}
