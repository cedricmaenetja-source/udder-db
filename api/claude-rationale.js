import { requireAuth } from './_auth';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
    const sessionId = await requireAuth(req, res);
    if (!sessionId) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { vendor, filters } = req.body;

    if (!vendor || !filters) {
        return res.status(400).json({ error: 'vendor and filters are required' });
    }

    const prompt = `You are an HR tech analyst. Score how well this vendor matches a buyer's requirements.

VENDOR:
- Name: ${vendor.name}
- Modules: ${vendor.modules}
- Sub-categories: ${vendor.subcategories}
- Features: ${vendor.features}
- Integrations: ${vendor.integrations}
- Regions: ${vendor.region}
- Org sizes served: ${vendor.headcount}
- Description: ${vendor.description}

BUYER REQUIREMENTS:
- Industry: ${filters.industry || 'not specified'}
- Product type: ${filters.product_type || 'not specified'}
- Target market: ${filters.target_market || 'not specified'}
- Employee count: ${filters.employee_count || 'not specified'}
- Region: ${filters.region || 'not specified'}
- Required modules: ${(filters.required_modules || []).join(', ') || 'not specified'}
- Required features: ${(filters.required_features || []).join(', ') || 'not specified'}
- Required integrations: ${(filters.required_integrations || []).join(', ') || 'none'}
- Optional features: ${(filters.optional_features || []).join(', ') || 'none'}
- Use cases: ${(filters.use_cases || []).join(', ') || 'not specified'}
- Keywords: ${(filters.keywords || []).join(', ') || 'none'}
- Query: ${filters.query || 'not specified'}

Respond ONLY with valid JSON, no markdown, no explanation outside the JSON:
{
  "score": <integer 0-100>,
  "rationale": "<2-3 sentences written directly to the buyer in second person (e.g. 'This vendor matches your requirements because...'). Focus on how the vendor fits or gaps against their specific modules, features, use cases and region. Do not refer to 'the buyer' — use 'you' and 'your'.>"
}`;

    try {
        const message = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = message.content?.[0]?.text || '';
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);

        if (typeof parsed.score !== 'number' || !parsed.rationale) {
            return res.status(500).json({ error: 'Invalid response format from Claude' });
        }
        
        return res.status(200).json({
            score: parsed.score,
            rationale: parsed.rationale
        });

    } catch (err) {
        console.error('claude-rationale error:', err);
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }
}