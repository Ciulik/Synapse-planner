import { fetchGoogleDocText } from "./google-doc-fetch";

import { Router, type IRouter } from "express";
import { ExtractIdeasBody, ExtractIdeasResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const extractionModel = "gemini-3.5-flash-lite";
const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${extractionModel}:generateContent`;
const domains = ["technical", "design", "product", "marketing", "ops"] as const;
type IdeaDomain = (typeof domains)[number];

type RawIdea = {
  id: string;
  description: string;
  domain: IdeaDomain;
  source_snippet?: string;
};

type ScoredIdea = RawIdea & {
  score: number;
  assigned_to: string | null;
};

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

function inferBasePriority(idea: RawIdea): 1 | 2 | 3 {
  const context = `${idea.description} ${idea.source_snippet ?? ""}`;

  if (
    /\b(not urgent|not important|not a priority|low priority|not critical|no rush|whenever|not needed right now)\b/i.test(
      context,
    )
  ) {
    return 1;
  }

  if (
    /\b(urgent|urgently|asap|immediately|critical|blocker|blocking|must|first|before anything else|today|now)\b/i.test(
      context,
    )
  ) {
    return 3;
  }

  if (
    /\b(deadline|by friday|by monday|by tuesday|by wednesday|by thursday|by saturday|by sunday|next week|next thursday|this week|launch|notice|soon)\b/i.test(
      context,
    )
  ) {
    return 2;
  }

  return 1;
}

function parseRawIdeas(value: unknown): RawIdea[] {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as { ideas?: unknown }).ideas)
  ) {
    throw new Error("Gemini extraction did not return an ideas array.");
  }

  return (value as { ideas: unknown[] }).ideas.map((idea, index) => {
    if (!idea || typeof idea !== "object") {
      throw new Error(`Gemini returned an invalid idea at index ${index}.`);
    }

    const candidate = idea as Record<string, unknown>;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.description !== "string" ||
      !domains.includes(candidate.domain as IdeaDomain)
    ) {
      throw new Error(`Gemini returned an invalid idea at index ${index}.`);
    }

    return {
      id: candidate.id,
      description: candidate.description,
      domain: candidate.domain as IdeaDomain,
      ...(typeof candidate.source_snippet === "string"
        ? { source_snippet: candidate.source_snippet }
        : {}),
    };
  });
}

function scoreAndAssignIdeas(
  ideas: RawIdea[],
  team: Array<{ name: string; role: IdeaDomain }>,
): ScoredIdea[] {
  return ideas
    .map((idea) => {
      const assignedMember = team.find((member) => member.role === idea.domain);
      const basePriority = inferBasePriority(idea);
      const domainMatchWeight = assignedMember ? 2 : 1;

      return {
        ...idea,
        score: basePriority * domainMatchWeight,
        assigned_to: assignedMember?.name ?? null,
      };
    })
    .sort((left, right) => right.score - left.score);
}

function buildArguerPrompt(
  notes: string,
  team: Array<{ name: string; role: IdeaDomain }>,
  ideas: ScoredIdea[],
): string {
  return `Review this complete Synapse plan after extraction, scoring, and owner assignment. Identify at most 2-3 genuine risks or gaps: contradictions between ideas, missing owners, or unrealistic timing. For each risk, also suggest one concrete, actionable fix — something the team could actually do, not a vague suggestion. Do not invent risks if the plan is genuinely solid.
Return only valid JSON in this shape:
{
  "risks": [
    {
      "issue": "A short, concrete risk or gap",
      "fix": "A specific, actionable suggestion to resolve it"
    }
  ]
}
Raw meeting notes:
${notes}
Team:
${JSON.stringify(team)}
Scored and assigned plan:
${JSON.stringify(ideas)}`;
}

router.post("/extract-ideas", async (req, res) => {
  console.log("DEBUG: route hit");

  let notesText = req.body.notes;

  if (!notesText && req.body.docUrl) {
    try {
      notesText = await fetchGoogleDocText(req.body.docUrl);
    } catch (err) {
      res.status(400).json({
        error:
          err instanceof Error
            ? err.message
            : "Could not read that Google Doc.",
      });
      return;
    }
  }

  const parsed = ExtractIdeasBody.safeParse({ ...req.body, notes: notesText });
  console.log("DEBUG notesText:", JSON.stringify(notesText));
  console.log("DEBUG req.body.docUrl:", req.body.docUrl);

  if (!parsed.success) {
    res.status(400).json({
      error:
        "Provide meeting notes and a valid team list before generating a plan.",
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
    console.log("DEBUG: about to call Gemini extraction");

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
            parts: [
              {
                text: buildExtractionPrompt(notesText, parsed.data.team),
              },
            ],
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
                      enum: [
                        "technical",
                        "design",
                        "product",
                        "marketing",
                        "ops",
                      ],
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
    console.log(
      "DEBUG: extraction response status:",
      response.status,
      response.ok,
    );
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      req.log.warn("Gemini returned no extraction content");
      res
        .status(502)
        .json({ error: "Gemini returned an empty extraction. Try again." });
      return;
    }

    const rawIdeas = parseRawIdeas(JSON.parse(text));
    const scoredIdeas = scoreAndAssignIdeas(rawIdeas, parsed.data.team);

    const arguerController = new AbortController();
    const arguerTimeout = setTimeout(() => arguerController.abort(), 30_000);
    const arguerResponse = await fetch(geminiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: arguerController.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are Synapse's arguer pass. Be skeptical but fair. Find only genuine risks or gaps in the plan. Never invent a risk just to fill the list.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: buildArguerPrompt(
                  parsed.data.notes,
                  parsed.data.team,
                  scoredIdeas,
                ),
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
          maxOutputTokens: 8192,
          responseSchema: {
            type: "OBJECT",
            properties: {
              risks: {
                type: "ARRAY",
                maxItems: 3,
                items: {
                  type: "OBJECT",
                  properties: {
                    issue: { type: "STRING" },
                    fix: { type: "STRING" },
                  },
                  required: ["issue", "fix"],
                },
              },
            },
            required: ["risks"],
          },
        },
      }),
    }).finally(() => clearTimeout(arguerTimeout));

    if (!arguerResponse.ok) {
      const rawError = await arguerResponse.text();
      req.log.warn(
        { statusCode: arguerResponse.status, rawError },
        "Gemini arguer request failed",
      );
      res.status(arguerResponse.status).json({
        error: rawError,
        rawError,
        statusCode: arguerResponse.status,
      });
      return;
    }

    const arguerPayload = (await arguerResponse.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const arguerText = arguerPayload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!arguerText) {
      req.log.warn("Gemini arguer returned no content");
      res
        .status(502)
        .json({ error: "Gemini returned an empty risk review. Try again." });
      return;
    }

    const arguerResult = JSON.parse(arguerText) as { risks?: unknown };
    const risks = Array.isArray(arguerResult.risks)
      ? arguerResult.risks
          .filter(
            (risk): risk is { issue: string; fix: string } =>
              !!risk &&
              typeof risk === "object" &&
              typeof (risk as any).issue === "string" &&
              typeof (risk as any).fix === "string",
          )
          .slice(0, 3)
      : [];

    const result = ExtractIdeasResponse.parse({ ideas: scoredIdeas, risks });
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
