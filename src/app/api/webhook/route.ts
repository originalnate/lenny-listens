import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";
import { IntakeData, GeneratedPerspective } from "@/lib/lenny-methodology";

// Webhook endpoint for Perspective AI intake completion
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log("Webhook received:", JSON.stringify(payload, null, 2));

    // Extract conversation data from Perspective webhook payload
    const conversationId = payload.conversation_id || payload.id;
    const fields = payload.fields || {};

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversation_id" },
        { status: 400 }
      );
    }

    // Map Perspective fields to our IntakeData structure
    const intake: IntakeData = {
      conversation_id: conversationId,
      name: fields.name || "Unknown",
      company_domain: fields.company_domain || "",
      use_case: fields.use_case || "feature_request",
      problem_to_solve: fields.problem_to_solve,
      current_workaround: fields.current_workaround,
      market_or_audience: fields.market_or_audience,
      hypothesis: fields.hypothesis,
      feature_name: fields.feature_name,
      feedback_aspects: fields.feedback_aspects,
      created_at: new Date().toISOString(),
    };

    // Create the pending perspective record
    const perspectiveRecord: GeneratedPerspective = {
      conversation_id: conversationId,
      status: "pending",
      intake,
      created_at: new Date().toISOString(),
    };

    // Store in Vercel KV
    await kv.set(`perspective:${conversationId}`, perspectiveRecord);

    // Also add to a list of pending generations for easy lookup
    await kv.lpush("pending_perspectives", conversationId);

    console.log(`Stored intake for conversation ${conversationId}`);

    return NextResponse.json({
      success: true,
      conversation_id: conversationId,
      message: "Intake stored, perspective generation pending",
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// GET endpoint to check webhook status
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "lenny-listens-webhook",
    timestamp: new Date().toISOString(),
  });
}
