import { authorize } from './header';
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Output shape — identical to original, no changes:
const EMPTY_FILTERS = {
  industry:              "human resources",
  product_type:          null,
  target_market:         null,
  employee_count:        null,
  region:                null,
  required_modules:      [],
  required_features:     [],
  required_integrations: [],
  optional_features:     [],
  use_cases:             [],
  technology:            [],
  keywords:              [],
};

const PROMPT = (query) => `Extract structured HR software search filters from the query below.

Rules:
- Return ONLY valid JSON. No markdown, no explanation, no backticks.
- Omit fields that are not clearly implied — use null or [].
- All string values lowercase.

Field constraints:
- industry: always "human resources"
- product_type: one of ["platform","software","system","tool","dashboard","app","service"] or null
- target_market: derive from employee count if given —
    1–50 → "small teams" | 51–250 → "small businesses" | 251–1000 → "mid-sized companies" | 1000+ → "enterprise companies"
  or extract directly if mentioned. null if not implied.
- employee_count: integer if a specific number is mentioned, else null
- region: normalise to one of ["global","north america","south america","europe","africa","asia","middle east","australia"]
  or a specific lowercase country name. null if not mentioned.
- required_modules: top-level HR module names explicitly requested, e.g. ["Payroll", "ATS / Recruiting", "Performance Management", "Employee Engagement", "Core HR / HRIS", "People Analytics", "Time & Attendance"]
- required_features: specific sub-module capabilities explicitly requested, e.g. ["Payroll Processing", "Goal Setting & OKRs", "Candidate Pipeline Management"]
- required_integrations: third-party tools or platforms the vendor must integrate with, e.g. ["Workday", "HiBob", "Slack", "Salesforce", "BambooHR", "ADP"]. Use the commonly known product name.
- optional_features: enhancements or nice-to-haves
- use_cases: business scenarios implied by the query
- technology: only from ["artificial intelligence","machine learning","cloud computing","natural language processing","automation"]
- keywords: 3–6 important search phrases from the query

Return this exact shape:
${JSON.stringify(EMPTY_FILTERS, null, 2)}

Query: "${query}"`;

export default async function handler(req, res) {
  authorize(req, res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { query } = req.body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }

  try {
    const response = await client.messages.create({
      model:      "claude-haiku-4-5-20251001", // fast + cheap — no need for Sonnet here
      max_tokens: 512,                          // structured JSON output is small
      temperature: 0,                           // deterministic extraction
      messages: [
        {
          role:    "user",
          content: PROMPT(query.trim()),
        },
      ],
    });

    const raw = response.content[0].text.trim();

    let filters;
    try {
      filters = JSON.parse(raw);
    } catch {
      // If Claude somehow still wraps in markdown, strip and retry once
      const stripped = raw
        .replace(/^```(?:json)?/m, "")
        .replace(/```$/m, "")
        .trim();
      try {
        filters = JSON.parse(stripped);
      } catch {
        return res.status(422).json({
          error: "Could not parse Claude output",
          raw,
        });
      }
    }

    // Ensure all expected keys are present even if Claude omitted some
    const result = { ...EMPTY_FILTERS, ...filters };

    return res.status(200).json(result);

  } catch (error) {
    console.error("[claude-filters]", error.message);
    return res.status(500).json({ error: error.message });
  }
}