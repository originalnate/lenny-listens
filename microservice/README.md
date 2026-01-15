# Lenny Listens Generator Microservice

An always-on microservice that generates custom Lenny research interviews using the Claude Agent SDK with Perspective AI's MCP server.

## Architecture

```
Webhook (Vercel) → Microservice → Claude Agent SDK → Perspective MCP → KV Update
```

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...        # Your Anthropic API key
PERSPECTIVE_MCP_TOKEN=mcp_u_...     # Perspective MCP bearer token
KV_REST_API_URL=https://...         # Vercel KV REST URL
KV_REST_API_TOKEN=...               # Vercel KV REST token
PORT=3001                           # Optional, defaults to 3001
```

## Local Development

```bash
cd microservice
npm install
npm run dev
```

Test with:
```bash
curl -X POST http://localhost:3001/generate \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "test-123",
    "intake": {
      "name": "Test User",
      "company_domain": "acme.com",
      "use_case": "feature_request"
    }
  }'
```

## Deployment Options

### Option 1: Railway (Recommended)
1. Connect your GitHub repo
2. Set environment variables
3. Deploy - it auto-detects the Dockerfile

### Option 2: Render
1. Create new Web Service
2. Connect repo, set root directory to `microservice`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`

### Option 3: Fly.io
```bash
cd microservice
fly launch
fly secrets set ANTHROPIC_API_KEY=... PERSPECTIVE_MCP_TOKEN=...
fly deploy
```

### Option 4: Docker (anywhere)
```bash
docker build -t lenny-generator .
docker run -p 3001:3001 \
  -e ANTHROPIC_API_KEY=... \
  -e PERSPECTIVE_MCP_TOKEN=... \
  lenny-generator
```

## Connecting to Webhook

Once deployed, update the Vercel webhook to call this microservice:

```typescript
// In /api/webhook/route.ts, after storing intake:
await fetch('https://your-microservice.railway.app/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ conversation_id: conversationId, intake })
});
```

Or set up a Perspective automation to call this endpoint directly.
