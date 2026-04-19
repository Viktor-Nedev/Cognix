import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
const elevenLabsModelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

app.use(express.json({ limit: "1mb" }));

// Request logging for debugging
app.use((request, _response, next) => {
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.path}`);
  next();
});

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    geminiConfigured: Boolean(geminiApiKey),
    elevenLabsConfigured: Boolean(elevenLabsApiKey),
  });
});

app.post("/api/problem", async (request, response) => {
  try {
    ensureGeminiConfigured();

    const problem = String(request.body?.problem || "").trim();
    if (!problem) {
      return response.status(400).json({ error: "Problem text is required." });
    }

    const result = await generateGeminiJson({
      schema: problemDecisionSchema,
      prompt: buildProblemPrompt(problem),
    });

    response.json(result);
  } catch (error) {
    handleApiError(response, error);
  }
});

app.post("/api/debate", async (request, response) => {
  try {
    ensureGeminiConfigured();

    const dispute = String(request.body?.dispute || "").trim();
    const opinions = Array.isArray(request.body?.opinions)
      ? request.body.opinions
          .map((item) => ({
            id: String(item?.id || "").trim(),
            label: String(item?.label || "").trim(),
            text: String(item?.text || "").trim(),
          }))
          .filter((item) => item.id && item.label && item.text)
      : [];

    if (!dispute) {
      return response.status(400).json({ error: "Dispute text is required." });
    }

    if (opinions.length < 2) {
      return response.status(400).json({ error: "At least two viewpoints are required." });
    }

    const result = await generateGeminiJson({
      schema: debateDecisionSchema,
      prompt: buildDebatePrompt(dispute, opinions),
    });

    response.json(result);
  } catch (error) {
    handleApiError(response, error);
  }
});

app.post("/api/speak", async (request, response) => {
  try {
    ensureElevenLabsConfigured();

    const text = String(request.body?.text || "").trim();
    const requestedVoiceId = String(request.body?.voiceId || "").trim();
    if (!text) {
      return response.status(400).json({ error: "Text is required for speech." });
    }

    const voiceId = requestedVoiceId || elevenLabsVoiceId;
    const elevenResponse = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/" +
        encodeURIComponent(voiceId) +
        "?output_format=mp3_44100_128",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: elevenLabsModelId,
        }),
      },
    );

    if (!elevenResponse.ok) {
      const errorText = await elevenResponse.text();
      console.error("ElevenLabs API Error:", {
        status: elevenResponse.status,
        body: errorText
      });
      throw createHttpError(
        elevenResponse.status,
        "ElevenLabs request failed: " + trimError(errorText),
      );
    }

    const audioBuffer = Buffer.from(await elevenResponse.arrayBuffer());
    response.setHeader("Content-Type", "audio/mpeg");
    response.setHeader("Cache-Control", "no-store");
    response.send(audioBuffer);
  } catch (error) {
    handleApiError(response, error);
  }
});

app.get("/api/voices", async (_request, response) => {
  try {
    ensureElevenLabsConfigured();

    const elevenResponse = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": elevenLabsApiKey,
      },
    });

    const payload = await elevenResponse.json().catch(() => null);

    if (!elevenResponse.ok) {
      const errorText = payload?.detail || payload?.error || "Unable to load ElevenLabs voices.";
      throw createHttpError(elevenResponse.status, trimError(errorText));
    }

    const voices = Array.isArray(payload?.voices)
      ? payload.voices.map((voice) => ({
          voice_id: String(voice?.voice_id || ""),
          name: String(voice?.name || "Unnamed voice"),
          category: String(voice?.category || ""),
          preview_url: String(voice?.preview_url || ""),
        })).filter((voice) => voice.voice_id)
      : [];

    response.json({
      voices,
      defaultVoiceId: elevenLabsVoiceId,
    });
  } catch (error) {
    handleApiError(response, error);
  }
});

app.use(express.static(__dirname));

app.get("*", (request, response, next) => {
  if (request.path.startsWith("/api/")) {
    return next();
  }

  if (request.path === "/cognix" || request.path === "/cognix/") {
    return response.sendFile(path.join(__dirname, "cognix.html"));
  }

  response.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log("Cognix server running on http://localhost:" + port);
});

async function generateGeminiJson({ schema, prompt }) {
  const geminiResponse = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(geminiModel) +
      ":generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      }),
    },
  );

  const payload = await geminiResponse.json().catch(() => null);

  if (!geminiResponse.ok) {
    const errorMessage =
      payload?.error?.message ||
      "Gemini request failed with status " + geminiResponse.status + ".";
    console.error("Gemini Error:", geminiResponse.status, payload);
    throw createHttpError(geminiResponse.status, errorMessage);
  }

  const text = extractGeminiText(payload);
  if (!text) {
    throw createHttpError(502, "Gemini returned an empty response.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw createHttpError(502, "Gemini returned invalid JSON.");
  }
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function buildProblemPrompt(problem) {
  return [
    "You are Cognix, an AI decision assistant.",
    "Return only structured JSON that matches the schema.",
    "Do not reveal hidden chain-of-thought or internal reasoning.",
    "Give a user-facing reasoning breakdown that is concise, practical, and easy to visualize.",
    "Analyze this decision problem:",
    problem,
    "",
    "Requirements:",
    "- Write in clear English.",
    "- Create exactly 3 decision options.",
    "- Every option must have balanced pros and cons.",
    "- Evaluation should focus on tradeoffs, not generic advice.",
    "- The final recommendation must pick one option and explain why.",
    "- spokenResponse should be a natural voice-friendly summary in 2-4 sentences.",
  ].join("\n");
}

function buildDebatePrompt(dispute, opinions) {
  const opinionBlock = opinions
    .map(
      (opinion) =>
        opinion.id +
        " (" +
        opinion.label +
        "): " +
        opinion.text,
    )
    .join("\n");

  return [
    "You are Cognix, an AI moderator.",
    "Return only structured JSON that matches the schema.",
    "Do not reveal hidden chain-of-thought or internal reasoning.",
    "Judge the debate fairly and compare the arguments by clarity, evidence, fairness, and practicality.",
    "Dispute:",
    dispute,
    "",
    "Opinions:",
    opinionBlock,
    "",
    "Requirements:",
    "- Score every opinion from 0 to 100 across clarity, evidence, fairness, practicality, and total.",
    "- Pick a single winner from the provided IDs only.",
    "- winnerId must exactly match one of the supplied opinion IDs.",
    "- Make the explanation direct, balanced, and demo-friendly.",
    "- spokenResponse should be a natural voice-friendly moderator summary in 2-4 sentences.",
  ].join("\n");
}

function ensureGeminiConfigured() {
  if (!geminiApiKey) {
    throw createHttpError(500, "Missing GEMINI_API_KEY in .env");
  }
}

function ensureElevenLabsConfigured() {
  if (!elevenLabsApiKey) {
    throw createHttpError(500, "Missing ELEVENLABS_API_KEY in .env");
  }
}

function handleApiError(response, error) {
  const status = Number(error?.status || 500);
  response.status(status).json({
    error: error?.message || "Unexpected server error.",
  });
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function trimError(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 240);
}

const optionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    pros: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 3,
    },
    cons: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 3,
    },
    risk: { type: "string" },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: ["title", "summary", "pros", "cons", "risk", "confidence"],
};

const problemDecisionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    understanding: { type: "string" },
    options: {
      type: "array",
      items: optionSchema,
      minItems: 3,
      maxItems: 3,
    },
    evaluation: {
      type: "object",
      additionalProperties: false,
      properties: {
        tradeoffs: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 4,
        },
        keyTension: { type: "string" },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: ["tradeoffs", "keyTension", "confidence"],
    },
    decision: {
      type: "object",
      additionalProperties: false,
      properties: {
        recommendedOption: { type: "string" },
        rationale: { type: "string" },
        nextStep: { type: "string" },
      },
      required: ["recommendedOption", "rationale", "nextStep"],
    },
    spokenResponse: { type: "string" },
  },
  required: [
    "title",
    "summary",
    "understanding",
    "options",
    "evaluation",
    "decision",
    "spokenResponse",
  ],
};

const scorecardSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    clarity: { type: "integer", minimum: 0, maximum: 100 },
    evidence: { type: "integer", minimum: 0, maximum: 100 },
    fairness: { type: "integer", minimum: 0, maximum: 100 },
    practicality: { type: "integer", minimum: 0, maximum: 100 },
    total: { type: "integer", minimum: 0, maximum: 100 },
    keyStrength: { type: "string" },
    keyWeakness: { type: "string" },
  },
  required: [
    "id",
    "label",
    "clarity",
    "evidence",
    "fairness",
    "practicality",
    "total",
    "keyStrength",
    "keyWeakness",
  ],
};

const debateDecisionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdictTitle: { type: "string" },
    winnerId: { type: "string" },
    winnerLabel: { type: "string" },
    reasoning: { type: "string" },
    moderatorSummary: { type: "string" },
    scorecards: {
      type: "array",
      items: scorecardSchema,
      minItems: 2,
      maxItems: 4,
    },
    spokenResponse: { type: "string" },
  },
  required: [
    "verdictTitle",
    "winnerId",
    "winnerLabel",
    "reasoning",
    "moderatorSummary",
    "scorecards",
    "spokenResponse",
  ],
};
