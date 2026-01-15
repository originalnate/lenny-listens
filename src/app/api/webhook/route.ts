import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";
import { IntakeData, GeneratedPerspective } from "@/lib/lenny-methodology";

// Webhook endpoint for Perspective AI intake completion
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log("Webhook received:", JSON.stringify(payload, null, 2));

    // Extract conversation data from Perspective webhook payload
    // Perspective uses interview_id for the conversation ID
    // and structured_output for the collected fields
    const conversationId = payload.interview_id || payload.conversation_id || payload.id;
    const fields = payload.structured_output || payload.fields || {};
    const participantMeta = payload.participant_metadata || {};
    const sessionId = participantMeta.session_id as string | undefined;

    console.log("Session ID from metadata:", sessionId);

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversation_id/interview_id" },
        { status: 400 }
      );
    }

    // Map Perspective fields to our IntakeData structure
    const intake: IntakeData = {
      conversation_id: conversationId,
      name: fields.name || participantMeta.name || "Unknown",
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

    // Index by session_id if provided (for client-side lookup)
    if (sessionId) {
      await kv.set(`session:${sessionId}`, conversationId, { ex: 3600 }); // Expire in 1 hour
      console.log(`Indexed session ${sessionId} -> ${conversationId}`);
    }

    console.log(`Stored intake for conversation ${conversationId}`);

    // Trigger perspective generation via Railway microservice (fire and forget)
    const generatorUrl = process.env.GENERATOR_URL || "https://lenny-listens-production.up.railway.app";
    fetch(`${generatorUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId, intake }),
    }).catch((err) => {
      console.error("Failed to trigger generation:", err);
    });

    console.log(`Triggered generation for conversation ${conversationId}`);

    return NextResponse.json({
      success: true,
      conversation_id: conversationId,
      message: "Intake stored, generation triggered",
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
