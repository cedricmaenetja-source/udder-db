import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { query } = req.body;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.info('key', process.env.OPENAI_API_KEY);
    const prompt = `
You are an AI that extracts structured search filters from HR-related software queries.

Your job:
- Analyze the user query.
- Extract structured filters relevant to HR software vendors.
- Return ONLY valid JSON.
- Do not include explanations or text outside the JSON.
- If a field is not present, return null.
- All values must be lowercase.
- Arrays must always be arrays (even if one item).
- Do not invent features that are not clearly implied.

Normalization Rules:

1. Industry is always "human resources".

2. Product type must be one of:
["platform", "software", "system", "tool", "dashboard", "app", "service"]

3. Target market must be one of:
["small teams", "small businesses", "mid-sized companies", "enterprise companies", "remote teams", "global companies"]

4. If employee count is mentioned (e.g. 10 employees, 300 employees):
- Include:
"employee_count": number
- Also map to target_market:
1-50 → small teams
51-250 → small businesses
251-1000 → mid-sized companies
1000+ → enterprise companies

5. Region:
- Extract country, continent, or geographic scope if mentioned.
- Normalize to one of:
["global", "north america", "south america", "europe", "africa", "asia", "middle east", "australia"]
- If a specific country is mentioned (e.g. south africa, germany, usa), include it as lowercase string.
- If nothing is mentioned, return null.

6. Required features should be core capabilities explicitly requested.

7. Optional features should be enhancements.

8. Technology should include only specific technologies:
["artificial intelligence", "machine learning", "cloud computing", "natural language processing", "automation"]

9. Keywords should contain important search phrases from the query.

Return JSON in this exact format:

{
  "industry": "human resources",
  "product_type": null,
  "target_market": null,
  "employee_count": null,
  "region": null,
  "required_features": [],
  "optional_features": [],
  "use_cases": [],
  "technology": [],
  "keywords": []
}

User query: "${query}".
`;

    const response = await client.responses.create({
      model: "gpt-5-mini",
    //   temperature: 0,
    //   max_output_tokens: 2000,
      input: prompt
    });

    let text = response.output_text;

    if (text.startsWith("```")) {
      text = text
        .replace(/^```json\s*/, "")
        .replace(/^```\s*/, "")
        .replace(/```$/, "")
        .trim();
    }

    let filters;
    try {
      filters = JSON.parse(text);
    } catch {
      filters = { error: "Could not parse OpenAI output", raw: text };
    }

    res.status(200).json(filters);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}