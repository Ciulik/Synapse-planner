import { Router, type IRouter } from "express";
import { ExtractIdeasBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/extract-ideas", (req, res) => {
  const parsed = ExtractIdeasBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Provide meeting notes and a valid team list before generating a plan.",
    });
    return;
  }

  // The extraction engine is intentionally kept behind this contract. The
  // provider is configured separately, so we fail explicitly instead of
  // returning guessed or placeholder ideas when it is unavailable.
  res.status(503).json({
    error:
      "The extraction provider is not configured. Add a provider to generate a plan.",
  });
});

export default router;