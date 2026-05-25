/**
 * POST /api/claude-chat
 *
 * Body:   { messages: [{ role: 'user'|'assistant', content: string }] }
 * Returns { reply: string, vendorsQueried: number }
 */
import { authorize } from './header';

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/* ─────────────────────────────────────────────────────────────
   STEP 1 — Extract keywords from user message
   Maps to module names, sub-module names, and feature names
   from data->company->modules
───────────────────────────────────────────────────────────── */
async function extractIntent(userMessage) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `You are parsing an HR tech search query. Extract keywords that map to HR software modules, sub-modules, features, and integrations.

Query: "${userMessage}"

Return ONLY valid JSON, no markdown:
{
  "moduleKeywords": ["Payroll", "Performance Management", "LMS"],
  "subModuleKeywords": ["Payroll Processing", "Goal Setting", "Onboarding"],
  "featureKeywords": ["automated payroll", "skills gap", "compliance training"],
  "categoryKeywords": ["HR Tech", "Payroll", "LMS", "HRIS", "ATS"],
  "integrationKeywords": ["Workday", "Slack", "Salesforce", "BambooHR"]
}

Rules:
- moduleKeywords: top-level HR module names (e.g. "Payroll", "ATS / Recruiting", "Employee Engagement")
- subModuleKeywords: sub-module names within modules (e.g. "Tax Filing", "Candidate Pipeline", "Recognition")
- featureKeywords: specific feature or capability words from the query
- categoryKeywords: product category tags
- integrationKeywords: any software tools or platforms mentioned (e.g. "Workday", "Slack", "Salesforce")
- Only include what is clearly implied. Empty arrays are fine.`,
      },
    ],
  });

  try {
    const raw = response.content[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch {
    return { moduleKeywords: [], subModuleKeywords: [], featureKeywords: [], categoryKeywords: [], integrationKeywords: [] };
  }
}

/* ─────────────────────────────────────────────────────────────
   STEP 2 — Query Supabase using only the specified columns
   Searches: name, short_description, categories, data (JSONB)
───────────────────────────────────────────────────────────── */
async function fetchRelevantVendors(intent) {
  const {
    moduleKeywords = [],
    subModuleKeywords = [],
    featureKeywords = [],
    categoryKeywords = [],
    integrationKeywords = [],
  } = intent;

  // Collect all keywords into one flat list for searching
  const allKeywords = [
    ...moduleKeywords,
    ...subModuleKeywords,
    ...featureKeywords,
  ];

  // Build OR filters across name, short_description, categories,
  // and JSONB paths inside data->company->modules
  const orParts = [];

  // Search name + short_description + categories
  allKeywords.forEach(k => {
    orParts.push(`name.ilike.%${k}%`);
    orParts.push(`short_description.ilike.%${k}%`);
  });

  categoryKeywords.forEach(k => {
    orParts.push(`categories.ilike.%${k}%`);
  });

  // Integration keywords — search name + short_description
  // (deep JSONB array search on data->company->integrations is handled in post-filter)
  integrationKeywords.forEach(k => {
    orParts.push(`name.ilike.%${k}%`);
    orParts.push(`short_description.ilike.%${k}%`);
  });

  // If no keywords at all, return empty
  if (orParts.length === 0) return [];

  const { data, error } = await supabase
    .from('tblvendors')
    .select(`
      id,
      name,
      short_description,
      categories,
      logo,
      data
    `)
    .or(orParts.join(','))
    .limit(12);

  if (error) {
    console.error('[claude-chat] Supabase error:', error.message);
    return [];
  }

  // Post-filter in JS: score each vendor by how many module/submodule/feature
  // keywords appear inside data->company->modules (the JSONB blob)
  const scored = (data || []).map(vendor => {
    const score = scoreVendorModules(vendor, intent);
    return { ...vendor, _relevanceScore: score };
  });

  // Sort by relevance score descending, take top 10
  scored.sort((a, b) => b._relevanceScore - a._relevanceScore);
  return scored.slice(0, 10);
}

/* ─────────────────────────────────────────────────────────────
   SCORE — count keyword hits inside data->company->modules
   Checks module names, sub-module names, and feature names/descriptions
───────────────────────────────────────────────────────────── */
function scoreVendorModules(vendor, intent) {
  const modules      = vendor.data?.company?.modules || {};
  const integrations = vendor.data?.company?.integrations || [];

  const {
    moduleKeywords = [],
    subModuleKeywords = [],
    featureKeywords = [],
    integrationKeywords = [],
  } = intent;

  let score = 0;

  // Score integrations — +3 for each exact match, +1 for partial
  integrationKeywords.forEach(k => {
    const kLower = k.toLowerCase();
    integrations.forEach(integration => {
      const intName = (integration.name || '').toLowerCase();
      const intCat  = (integration.category || '').toLowerCase();
      if (intName === kLower)                        score += 3;
      else if (intName.includes(kLower))             score += 2;
      else if (intCat.includes(kLower))              score += 1;
    });
  });

  // Score modules, sub-modules and features
  for (const [moduleName, subModules] of Object.entries(modules)) {
    const moduleNameLower = moduleName.toLowerCase();

    moduleKeywords.forEach(k => {
      if (moduleNameLower.includes(k.toLowerCase())) score += 3;
    });

    for (const [subModuleName, features] of Object.entries(subModules)) {
      const subNameLower = subModuleName.toLowerCase();

      subModuleKeywords.forEach(k => {
        if (subNameLower.includes(k.toLowerCase())) score += 2;
      });

      if (Array.isArray(features) && features.length > 0) {
        features.forEach(feature => {
          const featureText = `${feature.name || ''} ${feature.description || ''}`.toLowerCase();
          featureKeywords.forEach(k => {
            if (featureText.includes(k.toLowerCase())) score += 2;
          });
          subModuleKeywords.forEach(k => {
            if (subNameLower.includes(k.toLowerCase())) score += 1;
          });
        });
      }
    }
  }

  return score;
}

/* ─────────────────────────────────────────────────────────────
   STEP 3 — Format vendors into compact context for Claude
   Surfaces modules/sub-modules that have actual features
───────────────────────────────────────────────────────────── */
function formatVendorContext(vendors) {
  if (!vendors.length) return 'No matching vendors found for this query.';

  return vendors.map(v => {
    const company = v.data?.company || {};
    const modules = company.modules || {};

    // Only list modules/sub-modules that have at least one feature
    const activeModules = [];
    for (const [moduleName, subModules] of Object.entries(modules)) {
      const activeSubModules = [];
      for (const [subName, features] of Object.entries(subModules)) {
        if (Array.isArray(features) && features.length > 0) {
          const featureNames = features.map(f => f.name).filter(Boolean).join(', ');
          activeSubModules.push(featureNames ? `${subName} (${featureNames})` : subName);
        }
      }
      if (activeSubModules.length > 0) {
        activeModules.push(`${moduleName}: ${activeSubModules.join(' | ')}`);
      }
    }

    // Integrations
    const integrations = (company.integrations || [])
      .map(i => i.name)
      .slice(0, 6)
      .join(', ');

    const parts = [`• ${v.name}`];
    if (v.categories)         parts.push(`[${v.categories}]`);
    if (v.short_description)  parts.push(`— ${v.short_description.slice(0, 120)}`);
    if (activeModules.length) parts.push(`\n  Capabilities: ${activeModules.join(' / ')}`);
    if (integrations)         parts.push(`\n  Integrates with: ${integrations}`);

    return parts.join(' ');
  }).join('\n\n');
}

/* ─────────────────────────────────────────────────────────────
   MAIN HANDLER
───────────────────────────────────────────────────────────── */
async function claudeChat(req, res) {
  authorize(req, res);

  try {
    const { messages, userName } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find(m => m.role === 'user')?.content || '';

    const intent  = await extractIntent(lastUserMessage);
    const vendors = await fetchRelevantVendors(intent);
    const context = formatVendorContext(vendors);

    // Build a slim vendor stub array for the client to render as cards
    const vendorStubs = vendors.map(v => ({
      id:               v.id,
      name:             v.name,
      logo:             v.logo || null,
      categories:       v.categories || null,
      short_description: v.short_description
        ? v.short_description.slice(0, 120)
        : null,
    }));

    const userGreeting = userName ? `You are speaking with ${userName}. Address them by their first name naturally — use it in your opening response and occasionally throughout the conversation, but not on every message.` : '';
    const systemPrompt = `You are Udder AI, the assistant for the Udder Database — a curated directory of HR technology vendors.
    ${userGreeting}
    
## Relevant vendors retrieved from the database
${context}

## Response format
- Write a short, professional plain-text response (2–4 sentences).
- Do NOT list vendor names in your text — the UI renders clickable vendor cards automatically.
- Do NOT use bullet points, markdown, or special characters.
- Mention the number of vendors found and what they have in common.
- End with one helpful suggestion or follow-up question if relevant.

## Guidelines
- Only reference vendors from the context above. Do not invent vendors.
- If no vendors matched, say so and suggest refining the search.
- Keep the tone helpful, concise, and professional.`;

    const claudeMessages = [
      {
        role: 'user',
        content: systemPrompt + '\n\n[System context ends. Conversation follows.]',
      },
      {
        role: 'assistant',
        content: 'Understood. I will write clean plain-text replies without listing vendor names, as the UI handles vendor cards.',
      },
      ...messages.filter(m => typeof m.content === 'string'),
    ];

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      messages: claudeMessages,
    });

    const reply = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    return res.json({
      reply,
      vendors: vendorStubs,  // client renders these as clickable cards
    });

  } catch (err) {
    console.error('[/api/claude-chat]', err);
    return res.status(500).json({ error: 'Request failed', detail: err.message });
  }
}

module.exports = claudeChat;

/* ─── Route registration ───────────────────────────────────────

const claudeChat = require('./claudeChat');
router.post('/api/claude-chat', claudeChat);

─────────────────────────────────────────────────────────────── */