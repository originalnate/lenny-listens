import { query } from "@anthropic-ai/claude-agent-sdk";
import express from "express";

const app = express();
app.use(express.json());

const PERSPECTIVE_MCP_TOKEN = process.env.PERSPECTIVE_MCP_TOKEN;
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

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

  const response = await fetch(`${KV_REST_API_URL}/set/perspective:${conversationId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update KV: ${response.statusText}`);
  }
}

// Generate a Lenny perspective using Claude Agent SDK + Perspective MCP
async function generatePerspective(intake: {
  name: string;
  company_domain: string;
  use_case: string;
}) {
  const { name, company_domain, use_case } = intake;
  const companyName = company_domain.replace(/\.(com|io|co|ai|org|net)$/i, "");

  const prompt = `Create a Perspective AI research interview using the perspective_create tool.

Use these parameters:
- workspace_id: "66b2a843beda3ed6fd4507bd"
- agent_context: "research"
- description: Create a research interview called "Lenny Listens: ${companyName}" for understanding ${use_case} from ${companyName}'s customers.

Use Lenny Rachitsky's interviewing methodology from 269 episodes of Lenny's Podcast:

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
- Take a student posture, not an expert position

Target audience: ${companyName}'s customers discussing ${use_case}

Call the perspective_create tool now with this description.`;

  let result: {
    perspective_id?: string;
    preview_url?: string;
    share_url?: string;
  } = {};

  for await (const message of query({
    prompt,
    options: {
      maxTurns: 3,
      allowedTools: ["mcp__perspective__perspective_create"],
      mcpServers: {
        perspective: {
          type: "http",
          url: "https://getperspective.ai/mcp",
          headers: {
            Authorization: `Bearer ${PERSPECTIVE_MCP_TOKEN}`,
          },
        },
      },
    },
  })) {
    // Check for tool use results in the message
    if ("toolUseResults" in message && Array.isArray(message.toolUseResults)) {
      for (const toolResult of message.toolUseResults) {
        if (toolResult.toolName?.includes("perspective_create")) {
          try {
            const data = typeof toolResult.result === "string"
              ? JSON.parse(toolResult.result)
              : toolResult.result;
            result = {
              perspective_id: data.perspective_id,
              preview_url: data.preview_url,
              share_url: data.share_url,
            };
          } catch (e) {
            console.log("Failed to parse tool result:", e);
          }
        }
      }
    }

    // Also try to extract from the final result text
    if ("result" in message && typeof message.result === "string") {
      console.log("Agent result:", message.result);

      // Parse URLs from the result text if we don't have them yet
      if (!result.preview_url) {
        const previewMatch = message.result.match(/https:\/\/pv\.getperspective\.ai\/share\/[^\s\)]+/);
        const shareMatch = message.result.match(/https:\/\/getperspective\.ai\/share\/[^\s\)]+/);
        const idMatch = message.result.match(/Perspective ID[:\s`]*([a-f0-9]{24})/i);

        if (previewMatch) result.preview_url = previewMatch[0];
        if (shareMatch) result.share_url = shareMatch[0];
        if (idMatch) result.perspective_id = idMatch[1];
      }
    }
  }

  return result;
}

// Main endpoint - called by webhook or directly
app.post("/generate", async (req, res) => {
  try {
    const { conversation_id, intake } = req.body;

    if (!intake) {
      return res.status(400).json({ error: "Missing intake data" });
    }

    console.log(`Generating perspective for ${intake.company_domain}...`);

    // Generate the perspective using Claude + MCP
    const result = await generatePerspective(intake);

    if (!result.preview_url || !result.share_url) {
      throw new Error("Failed to get perspective URLs from generation");
    }

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
      console.log(`Updated KV for conversation ${conversation_id}`);
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
