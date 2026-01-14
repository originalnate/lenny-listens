import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";
import { GeneratedPerspective } from "@/lib/lenny-methodology";

// GET endpoint to fetch perspective status and URLs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing perspective ID" },
        { status: 400 }
      );
    }

    const perspective = await kv.get<GeneratedPerspective>(`perspective:${id}`);

    if (!perspective) {
      return NextResponse.json(
        { error: "Perspective not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(perspective);
  } catch (error) {
    console.error("Error fetching perspective:", error);
    return NextResponse.json(
      { error: "Failed to fetch perspective" },
      { status: 500 }
    );
  }
}

// PUT endpoint to update perspective with generated URLs (called after MCP generation)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing perspective ID" },
        { status: 400 }
      );
    }

    const perspective = await kv.get<GeneratedPerspective>(`perspective:${id}`);

    if (!perspective) {
      return NextResponse.json(
        { error: "Perspective not found" },
        { status: 404 }
      );
    }

    // Update the perspective with new data
    const updatedPerspective: GeneratedPerspective = {
      ...perspective,
      ...updates,
      generated_at: new Date().toISOString(),
    };

    await kv.set(`perspective:${id}`, updatedPerspective);

    // Remove from pending list if it was there
    await kv.lrem("pending_perspectives", 1, id);

    return NextResponse.json(updatedPerspective);
  } catch (error) {
    console.error("Error updating perspective:", error);
    return NextResponse.json(
      { error: "Failed to update perspective" },
      { status: 500 }
    );
  }
}
