import express from "express";
import { EventPayload, Scrawn } from "@scrawn/core";

// Initialize Scrawn SDK
const scrawn = new Scrawn({
  apiKey: process.env.SCRAWN_API_KEY as `sk_${string}`,
});

// Create Express app
const app = express();
app.use(express.json());

// Scrawn tracking middleware - tracks all endpoints
app.use(
  scrawn.middlewareEventConsumer({
    extractor: (req): EventPayload => {
      // You gotta change this to fit your app's systumm 
      return {
        userId: (req.headers?.["x-user-id"] as string) || "anonymous",
        debitAmount: req.body?.cost || 1,
      };
    },
  })
);

// API Routes
app.post("/api/generate", (req, res) => {
  const { prompt } = req.body;

  const result = `Generated content for: ${prompt}`;

  res.json({
    success: true,
    result,
    billed: req.body?.cost || 1,
  });
});

app.post("/api/analyze", (req, res) => {
  const { data } = req.body;

  const analysis = {
    itemCount: data?.length || 0,
    summary: "Analysis complete",
  };

  res.json({
    success: true,
    analysis,
    billed: req.body?.cost || 1,
  });
});

app.post("/api/translate", (req, res) => {
  const { text, targetLang } = req.body;

  const translated = `[${targetLang}] ${text}`;

  res.json({
    success: true,
    translated,
    billed: req.body?.cost || 1,
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Scrawn tracking enabled on all endpoints`);
  console.log(`\nTry it out:`);
  console.log(`curl -X POST http://localhost:${PORT}/api/generate \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "x-user-id: user_123" \\`);
  console.log(`  -d '{"prompt": "Hello world", "cost": 5}'`);
});
