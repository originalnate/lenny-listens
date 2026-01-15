import express from "express";

const app = express();
app.use(express.json());

const PERSPECTIVE_MCP_TOKEN = process.env.PERSPECTIVE_MCP_TOKEN;
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
const WORKSPACE_ID = "66b2a843beda3ed6fd4507bd";

if (!PERSPECTIVE_MCP_TOKEN) {
  console.error("Missing PERSPECTIVE_MCP_TOKEN environment variable");
  process.exit(1);
}

// Update KV with generated perspective data
async function updateKV(conversationId: string, data: Record<string, unknown>) {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    console.log("KV not configured, skipping update");
    return;
  }

  const response = await fetch(KV_REST_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SET", `perspective:${conversationId}`, JSON.stringify(data)]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("KV update failed:", response.status, errorText);
    throw new Error(`Failed to update KV: ${response.statusText}`);
  }

  console.log(`KV updated for ${conversationId}`);
}

// Intake data type
interface IntakeData {
  name: string;
  company_domain: string;
  use_case: string;
  problem_to_solve?: string;
  current_workaround?: string;
  market_or_audience?: string;
  hypothesis?: string;
  feature_name?: string;
  feedback_aspects?: string;
}

// Build the perspective description based on use case
function buildDescription(intake: IntakeData): string {
  const companyName = intake.company_domain.replace(/\.(com|io|co|ai|org|net)$/i, "");

  let researchGoal = "";
  let specificContext = "";

  if (intake.use_case === "new_product_discovery" || intake.use_case === "new product discovery") {
    researchGoal = "validate a new product concept";
    specificContext = `
Target audience: ${intake.market_or_audience || "potential customers"}
Hypothesis to validate: ${intake.hypothesis || "the product solves a real problem"}

Explore:
- Whether users have the problem this product solves
- How they currently deal with this problem
- Their reaction to the product concept
- What would make them want to use it`;
  } else if (intake.use_case === "feature_request" || intake.use_case === "feature requests") {
    researchGoal = "understand feature requests and user needs";
    specificContext = `
Problem users are trying to solve: ${intake.problem_to_solve || "unspecified"}
Current workaround: ${intake.current_workaround || "unknown"}

Explore:
- The specific pain points driving this request
- How they currently work around the limitation
- What an ideal solution would look like
- How important this is relative to other needs`;
  } else if (intake.use_case === "existing_feature_feedback" || intake.use_case === "existing feature feedback") {
    researchGoal = "get feedback on an existing feature";
    specificContext = `
Feature: ${intake.feature_name || "unspecified"}
Aspects to explore: ${intake.feedback_aspects || "general feedback"}

Explore:
- How they use this feature today
- What works well and what doesn't
- Specific frustrations or delights
- Ideas for improvement`;
  } else {
    researchGoal = intake.use_case;
    specificContext = "Explore the user's experience and needs in depth.";
  }

  return `Create a research interview called "Lenny Listens: ${companyName}" to ${researchGoal}.

${specificContext}

Use Lenny Rachitsky's interviewing methodology:

THREE-LAYER APPROACH:
1. Origin Story - Start with how they discovered the problem or need
2. Framework - Extract their mental model, criteria, and tradeoffs
3. Application - Get specific examples and concrete details

CORE TECHNIQUES:
- "Pull the thread" - When something interesting emerges, dig deeper
- Find tensions - Explore contradictions and tradeoffs
- Seek specifics - Ask for concrete examples for broad claims
- Pause and summarize - Periodically reflect back what you've heard

VOICE:
- Warm, curious, intellectually engaged
- Use phrases like "I'm curious...", "That's really interesting...", "Can you give me a specific example?"
- Take a student posture, not an expert position`;
}

// Call Perspective MCP to create a perspective
async function createPerspective(description: string): Promise<{
  perspective_id: string;
  preview_url: string;
  share_url: string;
}> {
  // MCP uses JSON-RPC 2.0 format, but returns SSE stream
  const response = await fetch("https://getperspective.ai/mcp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PERSPECTIVE_MCP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "perspective_create",
        arguments: {
          workspace_id: WORKSPACE_ID,
          description: description,
          agent_context: "research",
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("MCP call failed:", response.status, errorText);
    throw new Error(`MCP call failed: ${response.statusText}`);
  }

  // Handle SSE response - read the full text and parse
  const text = await response.text();
  console.log("Raw MCP response:", text.substring(0, 500));

  // Parse SSE format - look for JSON data in the stream
  let data: Record<string, unknown> = {};

  // SSE format: "event: message\ndata: {...json...}\n\n"
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const jsonStr = line.substring(6);
      try {
        const parsed = JSON.parse(jsonStr);
        console.log("Parsed SSE data:", JSON.stringify(parsed, null, 2));

        // Check for the result in various locations
        if (parsed.result?.content) {
          for (const item of parsed.result.content) {
            if (item.type === "text") {
              try {
                data = JSON.parse(item.text);
              } catch {
                console.log("Content text (not JSON):", item.text);
              }
            }
          }
        } else if (parsed.perspective_id || parsed.preview_url) {
          data = parsed;
        } else if (parsed.result) {
          data = parsed.result;
        }
      } catch (e) {
        // Not JSON, skip
      }
    }
  }

  console.log("Final parsed data:", JSON.stringify(data, null, 2));

  if (!data.perspective_id && !data.preview_url) {
    throw new Error("Failed to get perspective data from MCP response");
  }

  return {
    perspective_id: (data.perspective_id || data.id) as string,
    preview_url: data.preview_url as string,
    share_url: data.share_url as string,
  };
}

// Main endpoint
app.post("/generate", async (req, res) => {
  try {
    const { conversation_id, intake } = req.body;

    if (!intake) {
      return res.status(400).json({ error: "Missing intake data" });
    }

    console.log(`Generating perspective for ${intake.company_domain}...`);

    // Build the description from intake data
    const description = buildDescription(intake);
    console.log("Description:", description);

    // Create the perspective via MCP
    const result = await createPerspective(description);

    console.log(`Created perspective: ${result.perspective_id}`);

    // Update KV with the generated URLs
    if (conversation_id) {
      await updateKV(conversation_id, {
        conversation_id,
        status: "ready",
        intake,
        preview_url: result.preview_url,
        share_url: result.share_url,
        perspective_id: result.perspective_id,
        generated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      conversation_id,
      perspective_id: result.perspective_id,
      preview_url: result.preview_url,
      share_url: result.share_url,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return res.status(500).json({
      error: "Failed to generate perspective",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "lenny-listens-generator" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Lenny Listens microservice running on port ${PORT}`);
});
