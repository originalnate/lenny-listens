// Lenny's methodology distilled from 269 podcast transcripts

export const LENNY_METHODOLOGY = `Use Lenny Rachitsky's interviewing methodology:

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

export interface IntakeData {
  conversation_id: string;
  name: string;
  company_domain: string;
  use_case: "feature_request" | "new_product_discovery" | "existing_feature_feedback";
  problem_to_solve?: string;
  current_workaround?: string;
  market_or_audience?: string;
  hypothesis?: string;
  feature_name?: string;
  feedback_aspects?: string;
  created_at: string;
}

export interface GeneratedPerspective {
  conversation_id: string;
  status: "pending" | "generating" | "ready" | "error";
  intake: IntakeData;
  perspective_id?: string;
  preview_url?: string;
  share_url?: string;
  error?: string;
  created_at: string;
  generated_at?: string;
}

export function generatePerspectivePrompt(intake: IntakeData): string {
  const companyName = intake.company_domain?.replace(/\.(com|io|co|ai|org|net)$/i, "") || "Company";

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

export function getUseCaseLabel(useCase: string): string {
  const labels: Record<string, string> = {
    feature_request: "Feature Requests",
    new_product_discovery: "Product Discovery",
    existing_feature_feedback: "Feature Feedback",
  };
  return labels[useCase] || "Customer Research";
}
