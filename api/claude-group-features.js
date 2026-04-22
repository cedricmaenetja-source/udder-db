import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { query } = req.body;
    
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const prompt = `
You are an HR technology taxonomy classification engine.

Your task is to analyze a vendor's scraped feature list and group each feature under the correct predefined HR software module.

STRICT RULES:
- Do not create new modules.
- Do not invent features.
- A feature must appear in only one module.
- If a feature does not belong to any module, exclude it.
- Return valid JSON only.
- Do not include explanations.

PREDEFINED MODULES:
1. Core HR / HRIS
2. ATS / Recruiting
3. Payroll
4. Time & Attendance
5. Performance Management
6. Employee Engagement
7. People Analytics

CLASSIFICATION GUIDELINES:
Core HR / HRIS: employee records, onboarding, workflows, org charts, compliance records.
ATS / Recruiting: job posting, candidate tracking, CV parsing, interview scheduling.
Payroll: salary processing, tax calculations, payslips, benefits administration.
Time & Attendance: time tracking, leave management, shift scheduling.
Performance Management: goal setting, performance reviews, 360 feedback.
Employee Engagement: surveys, pulse surveys, recognition tools.
People Analytics: dashboards, predictive analytics, workforce insights.

Return output in this exact format:

{
  "grouped_features": {
    "Core HR / HRIS": [],
    "ATS / Recruiting": [],
    "Payroll": [],
    "Time & Attendance": [],
    "Performance Management": [],
    "Employee Engagement": [],
    "People Analytics": []
  }
}

Here is the vendor data:

${JSON.stringify(query)}
`;

    const response = await client.messages.create({
        model: "claude-sonnet-4-6", 
        max_tokens: 20000,
        temperature: 0,
        messages: [{ 
            role: "user", 
            content: [{
                "type": "text",
                "text": prompt
            }]
        }]
    });

    let text = response.content[0].text;
    if (text.startsWith("```")) {
        text = text
            .replace(/^```json\s*/, "")
            .replace(/^```\s*/, "")
            .replace(/```$/, "")
            .trim();
    }

    let groupedFeatures;
    try {
      groupedFeatures = JSON.parse(text);
    } catch {
      groupedFeatures = { error: "Could not parse Claude output", raw: text };
    }

    res.status(200).json(groupedFeatures);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}