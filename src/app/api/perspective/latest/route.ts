import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { GeneratedPerspective } from "@/lib/lenny-methodology";

// GET endpoint to fetch the most recent pending/generating perspective
export async function GET() {
  try {
    // Get the list of pending perspectives
    const pendingIds = await kv.lrange("pending_perspectives", 0, 20);

    if (!pendingIds || pendingIds.length === 0) {
      return NextResponse.json(
        { error: "No pending perspectives found" },
        { status: 404 }
      );
    }

    // Find the most recent one that's actually still pending or generating
    for (const id of pendingIds) {
      const perspective = await kv.get<GeneratedPerspective>(`perspective:${id}`);

      if (perspective && (perspective.status === "pending" || perspective.status === "generating")) {
        return NextResponse.json(perspective);
      }

      // If it's ready or error, remove it from the pending list
      if (perspective && (perspective.status === "ready" || perspective.status === "error")) {
        await kv.lrem("pending_perspectives", 1, id);
      }
    }

    // No actually pending perspectives found
    return NextResponse.json(
      { error: "No pending perspectives found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching latest perspective:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest perspective" },
      { status: 500 }
    );
  }
}
