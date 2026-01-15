import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";
import { GeneratedPerspective } from "@/lib/lenny-methodology";

// GET endpoint to fetch perspective by session ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session ID" },
        { status: 400 }
      );
    }

    // Look up conversation ID by session
    const conversationId = await kv.get<string>(`session:${sessionId}`);

    if (!conversationId) {
      return NextResponse.json(
        { error: "Session not found - intake may not be complete yet" },
        { status: 404 }
      );
    }

    // Get the perspective data
    const perspective = await kv.get<GeneratedPerspective>(`perspective:${conversationId}`);

    if (!perspective) {
      return NextResponse.json(
        { error: "Perspective not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(perspective);
  } catch (error) {
    console.error("Error fetching perspective by session:", error);
    return NextResponse.json(
      { error: "Failed to fetch perspective" },
      { status: 500 }
    );
  }
}
