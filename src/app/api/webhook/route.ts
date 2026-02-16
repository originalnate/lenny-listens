import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";
import {
  IntakeData,
  GeneratedPerspective,
  buildPerspectiveDescription,
} from "@/lib/lenny-methodology";

const PERSPECTIVE_API_TOKEN = process.env.PERSPECTIVE_API_TOKEN;
const PERSPECTIVE_WORKSPACE_SLUG = process.env.PERSPECTIVE_WORKSPACE_SLUG;

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

    // Generate perspective directly via Perspective API
    try {
      const description = buildPerspectiveDescription(intake);
      console.log("Creating perspective with description:", description.substring(0, 200));

      const apiResponse = await fetch(
        "https://getperspective.ai/api/v1/perspective/create",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PERSPECTIVE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspaceSlug: PERSPECTIVE_WORKSPACE_SLUG,
            userPrompt: description,
            agentContext: "research",
          }),
        }
      );

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        throw new Error(`Perspective API error ${apiResponse.status}: ${errorText}`);
      }

      const result = await apiResponse.json();
      console.log("Perspective API response:", JSON.stringify(result, null, 2));

      const perspectiveId = result.perspective_id || result.id;
      const previewUrl = result.preview_url;
      const shareUrl = result.share_url;

      // Update KV record to "ready" with URLs
      const readyRecord: GeneratedPerspective = {
        conversation_id: conversationId,
        status: "ready",
        intake,
        perspective_id: perspectiveId,
        preview_url: previewUrl,
        share_url: shareUrl,
        created_at: perspectiveRecord.created_at,
        generated_at: new Date().toISOString(),
      };

      await kv.set(`perspective:${conversationId}`, readyRecord);
      await kv.lrem("pending_perspectives", 1, conversationId);

      console.log(`Perspective ready for ${conversationId}: ${perspectiveId}`);
    } catch (err) {
      console.error("Failed to generate perspective:", err);
      // Update KV with error status
      const errorRecord: GeneratedPerspective = {
        conversation_id: conversationId,
        status: "error",
        intake,
        error: err instanceof Error ? err.message : String(err),
        created_at: perspectiveRecord.created_at,
      };
      await kv.set(`perspective:${conversationId}`, errorRecord);
      await kv.lrem("pending_perspectives", 1, conversationId);
    }

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
