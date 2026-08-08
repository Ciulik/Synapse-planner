import { Router, type IRouter } from "express";
import { ExtractIdeasBody, ExtractIdeasResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const extractionModel = "gemini-3-flash";
const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${extractionModel}:generateContent`;

function buildExtractionPrompt(notes: string, team: unknown): string {
  return `You are Synapse's idea-extraction engine. Extract every distinct actionable idea or task mentioned in the raw meeting notes below. Merge duplicates or near-duplicates into one entry. Tag each with the domain it most relates to: technical, design, product, marketing, or ops.

Do not invent ideas that are not present in the notes. If the notes do not mention an actionable idea, return an empty ideas array. The team list provides speaker context only; do not create ideas from team roles alone.

Return only valid JSON matching this shape:
{
  "ideas": [
    {
      "id": "idea-1",
      "description": "A concise actionable description",
      "domain": "technical",
      "source_snippet": "An exact or near-exact supporting phrase from the notes"
    }
  ]
}

The required fields for each idea are id, description, and domain. source_snippet is optional.

Team:
${JSON.stringify(team)}

Raw meeting notes:
${notes}`;
}

router.post("/extract-ideas", async (req, res) => {
  const parsed = ExtractIdeasBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Provide meeting notes and a valid team list before generating a plan.",
    });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error:
        "The extraction provider is not configured. Add a Gemini API key to generate a plan.",
    });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const response = await fetch(geminiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildExtractionPrompt(parsed.data.notes, parsed.data.team) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
          maxOutputTokens: 8192,
          responseSchema: {
            type: "OBJECT",
            properties: {
              ideas: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    description: { type: "STRING" },
                    domain: {
                      type: "STRING",
                      enum: ["technical", "design", "product", "marketing", "ops"],
                    },
                    source_snippet: { type: "STRING" },
                  },
                  required: ["id", "description", "domain"],
                },
              },
            },
            required: ["ideas"],
          },
        },
      }),
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const rawError = await response.text();
      let providerStatus: string | undefined;
      let providerMessage: string | undefined;
      try {
        const parsedError = JSON.parse(rawError) as {
          error?: { status?: string; message?: string };
        };
        providerStatus = parsedError.error?.status;
        providerMessage = parsedError.error?.message;
      } catch {
        // Preserve the raw provider body even when it is not JSON.
      }
      req.log.warn(
        {
          statusCode: response.status,
          providerStatus,
          providerMessage,
        },
        "Gemini extraction request failed",
      );
      res.status(response.status).json({
        error: rawError,
        rawError,
        statusCode: response.status,
      });
      return;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      req.log.warn("Gemini returned no extraction content");
      res.status(502).json({ error: "Gemini returned an empty extraction. Try again." });
      return;
    }

    const result = ExtractIdeasResponse.parse(JSON.parse(text));
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      req.log.warn("Gemini extraction request timed out");
      res.status(504).json({
        error: "Gemini took too long to respond. Please try again.",
      });
      return;
    }
    req.log.error({ err: error }, "Unexpected extraction failure");
    res.status(502).json({
      error: "We couldn't generate a plan right now. Please try again.",
    });
  }
});

export default router;