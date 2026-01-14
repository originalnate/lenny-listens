import { NextRequest, NextResponse } from "next/server";

// Lenny's methodology prompt - distilled from 269 podcast transcripts
const LENNY_METHODOLOGY = `Use Lenny Rachitsky's interviewing methodology:

APPROACH:
- Three-layer structure: Start with Origin Story (personal context), move to Framework (extract methodology), end with Application (specific examples)
- "Pull the thread" - When something interesting emerges, dig deeper with follow-up questions
- Find tensions - Explore contradictions and tradeoffs (e.g., "You mentioned X but also Y - how do you navigate that?")
- Seek specifics - When they make broad claims, ask for concrete examples

VOICE CHARACTERISTICS:
- Warm, curious, intellectually engaged
- Use phrases like "I'm curious...", "That's really interesting...", "Can you give me a specific example?"
- Position as a curious learner, not an expert interrogator
- Acknowledge and validate insights before probing deeper
- Both/and thinking - hold complexity, don't force binary choices

INTERVIEW STYLE:
- Start with genuine curiosity about their experience
- Listen actively and build questions on their answers
- Periodically summarize to ensure understanding
- Create space for reflection and nuance`;

interface IntakeData {
  name: string;
  company_domain: string;
  use_case: "feature_request" | "new_product_discovery" | "existing_feature_feedback";
  problem_to_solve?: string;
  current_workaround?: string;
  market_or_audience?: string;
  hypothesis?: string;
  feature_name?: string;
  feedback_aspects?: string;
}

function generatePerspectiveDescription(intake: IntakeData): string {
  const companyName = intake.company_domain?.replace(/\.(com|io|co|ai|org|net)$/, "") || "Company";

  let researchGoal = "";
  let targetTopic = "";

  switch (intake.use_case) {
    case "feature_request":
      researchGoal = `Understand what features customers are requesting and why. Explore the problems they're trying to solve${intake.problem_to_solve ? ` (specifically: ${intake.problem_to_solve})` : ""} and their current workarounds${intake.current_workaround ? ` (${intake.current_workaround})` : ""}.`;
      targetTopic = "feature requests and unmet needs";
      break;
    case "new_product_discovery":
      researchGoal = `Discover opportunities in ${intake.market_or_audience || "the target market"}. ${intake.hypothesis ? `Test the hypothesis: ${intake.hypothesis}` : "Understand customer needs and pain points in this space."}`;
      targetTopic = "new product opportunities and market needs";
      break;
    case "existing_feature_feedback":
      researchGoal = `Gather feedback on ${intake.feature_name || "existing features"}. Focus on ${intake.feedback_aspects || "usability, value, and satisfaction"}.`;
      targetTopic = `feedback on ${intake.feature_name || "current features"}`;
      break;
    default:
      researchGoal = "Understand customer needs and experiences.";
      targetTopic = "their experience and needs";
  }

  return `Create a research perspective called "Lenny Listens: ${companyName}"

RESEARCH GOAL: ${researchGoal}

TARGET: ${companyName}'s customers discussing ${targetTopic}

${LENNY_METHODOLOGY}`;
}

export async function POST(request: NextRequest) {
  try {
    const intake: IntakeData = await request.json();

    // Generate the perspective description
    const description = generatePerspectiveDescription(intake);

    // In production, this would call the Perspective API to create a new perspective
    // For now, we'll return a simulated response

    // TODO: Wire up actual Perspective API call
    // const perspectiveApiKey = process.env.PERSPECTIVE_API_KEY;
    // const response = await fetch("https://api.getperspective.ai/v1/perspectives", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${perspectiveApiKey}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     description,
    //     agent_context: "research",
    //     workspace_id: process.env.PERSPECTIVE_WORKSPACE_ID,
    //   }),
    // });

    const companyName = intake.company_domain?.replace(/\.(com|io|co|ai|org|net)$/, "") || "Company";

    // Simulated response for demo
    return NextResponse.json({
      success: true,
      perspective: {
        name: `Lenny Listens: ${companyName}`,
        company: companyName,
        useCase: intake.use_case,
        previewUrl: "https://pv.getperspective.ai/share/demo?mode=preview",
        shareUrl: "https://getperspective.ai/share/demo",
        description,
      },
    });
  } catch (error) {
    console.error("Error generating perspective:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate perspective" },
      { status: 500 }
    );
  }
}

// Webhook endpoint for intake completion
export async function GET(request: NextRequest) {
  // This endpoint can be used to check status or for health checks
  return NextResponse.json({ status: "ok", service: "lenny-listens-generator" });
}
