import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { query, target_market } = req.body;

    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    });
    console.info('key', process.env.GROQ_API_KEY);
    const prompt = `
You are a structured data extraction engine for HR software search queries.

## OBJECTIVE
Parse the user's natural language query and return a single valid JSON object representing structured search filters aligned to the HR vendor dataset schema. No text, explanation, or formatting outside the JSON.

---

## OUTPUT FORMAT
Return exactly this JSON structure. Never add or remove fields.

{
  "industry": "human resources",
  "product_type": null,
  "target_market": null,
  "employee_count": null,
  "region": null,
  "required_modules": [],
  "required_features": [],
  "technology": [],
  "use_cases": [],
  "keywords": []
}

---

## FIELD RULES

### industry
Always: "human resources"

### product_type
Must be one of: ["platform", "software", "system", "tool", "dashboard", "app", "service"]
→ If none mentioned, return null.

### target_market
Identify the intended customer segment for the HR software.

- Return **all options from the provided list** that match the meaning implied by the user query.
- Include multiple options if several list items represent the same segment or range.
- Always use the **exact text** from the list. Do not create new values.
- If no segment can be inferred, return 'null'.

Examples of overlapping mapping:

- "SMB to Enterprise", "SMBs to Enterprises", "Small to enterprise organizations", "SMBs to enterprise" → include all if the query implies this range.
- "Small to mid-sized businesses", "Mid-size businesses", "SMB to mid-market", "Small to mid-size businesses" → include all if the query implies this segment.
- "Flexible/temporary workforce", "Hourly and shift-based workforces", "Frontline / hourly workforce at scale" → include all if the query implies flexible or hourly workforce.
- "1–500+ employees", "Up to 500 employees", "50–5000+ employees", "1–5000+ employees", "1–100+ employees per location" → include all if the query implies the corresponding size.

**Must be selected from the list below**:

[${target_market.join(', ')}]

Output format:  
Always return an array with one or more values.  
Return 'null' only if no target market is mentioned.

Employee count mapping:
- 1–50 → "small teams"
- 51–250 → "small businesses"
- 251–1000 → "mid-sized companies"
- 1000+ → "enterprise companies"

Additional inference rules:
- Words like "startup", "small company", "few employees" → "small teams" or "small businesses"
- "mid-market", "growing company" → "mid-sized companies"
- "large company", "enterprise", "corporation" → "enterprise companies"
- "distributed teams", "remote workforce" → "remote teams"
- "international", "multinational" → "global companies"

When multiple segments apply, include all relevant matches from the list.

### employee_count
Return the raw number or range as a string (e.g., "500", "1000+"). Return null if not mentioned.

### region
→ If a continent is mentioned, use one of: ["global", "north america", "south america", "europe", "africa", "asia", "middle east", "australia"]
→ If a specific country is mentioned, return it as a lowercase string (e.g., "germany").
→ Return null if not mentioned.

### required_modules
Modules explicitly required. Use exact names from the taxonomy below.

### required_features
Subcategory features explicitly requested. Map to the closest taxonomy entry. Use exact subcategory names.

### technology
Only include if mentioned. Must be from: ["artificial intelligence", "machine learning", "cloud computing", "natural language processing", "automation"]

### use_cases
Real-world problems the user wants to solve, as concise lowercase strings (e.g., "reduce time-to-hire", "automate payroll processing").

### keywords
Important words and phrases from the query, as lowercase strings.

---

## FEATURE TAXONOMY
Map all features to the closest module and subcategory. Use exact names.

**Core HR / HRIS**
- employee records & profiles
- onboarding & offboarding
- organization management
- leave & absence management
- compensation & benefits
- document management
- compliance & audit

**ATS / Recruiting**
- job posting & distribution
- candidate pipeline management
- interview scheduling & feedback
- offer management
- employer branding

**Payroll**
- payroll processing
- tax filing & compliance
- compensation adjustments
- payslips & reporting

**Time & Attendance**
- time tracking
- shift & schedule management
- overtime & absence tracking

**Performance Management**
- goal setting & okrs
- performance reviews & cycles
- continuous feedback
- 360 feedback

**Employee Engagement**
- surveys & pulse checks
- recognition & rewards
- communication & announcements

**People Analytics**
- workforce dashboards & reports
- headcount & turnover analysis
- dei analytics
- predictive insights

---

## EXTRACTION RULES
- All string values must be lowercase.
- Arrays must always be arrays, even with a single item.
- Do not invent features not clearly implied by the query.
- Do not include explanations, markdown, or text outside the JSON.
- If a field has no value, return null (for strings) or [] (for arrays).
- required_features must always be a subset of features within required_modules.
- Distinguish required vs. optional: required = explicitly asked for; optional = implied or "nice to have" language (e.g., "ideally", "also", "bonus if").

---

## EXAMPLES

Query: "time tracking software for mid-market ro enterprise"
→ required_modules: ["time & attendance"]
→ required_features: ["time tracking"]
→ target_market: ["remote teams"]
→ product_type: "software"

Query: "enterprise payroll platform with AI and compliance for Europe"
→ required_modules: ["payroll"]
→ required_features: ["payroll processing", "tax filing & compliance"]
→ technology: ["artificial intelligence"]
→ target_market: ["enterprise companies"]
→ product_type: "platform"
→ region: "europe"

---

## USER QUERY
"${query}"
`;

    const response = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            { role: "user", content: prompt }
        ]
    });

    let text = response.choices[0].message.content;

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