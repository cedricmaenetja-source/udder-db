import { createClient } from '@supabase/supabase-js';
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildVendorText(vendor) {
    const description = (vendor.people_data_labs.status === 200 && vendor.people_data_labs.summary !== null) ? vendor.people_data_labs.summary : vendor.short_description;
    let category = vendor.categories;
    category = category.replace('•', ',');
    return `
        ${vendor.name}
        ${description || ""}
        Features: ${vendor.organic_results_firecrawl.json.key_features?.join(", ") || ""}
        Category: ${category || ""}
        Country: ${getVendorRegion(vendor) || ""}
    `;
}

function lowerCase(str){
    if (str === null) return;
    return str.toLowerCase();
}

export function getVendorRegion(vendor){
    let result = [];

    const location = (vendor.people_data_labs !== null) ? vendor.people_data_labs.location : {};

    if (Object.keys(location).length === 0) return;
    
    const country   = lowerCase(location.country || '');
    const locality  = lowerCase(location.locality || '');
    const continent = lowerCase(location.continent || '');
    const region    = lowerCase(location.region || '');
    const metro     = lowerCase(location.metro || '');
    const name      = lowerCase(location.name || '');

    if (country != '') result.push(country);
    if (locality != '') result.push(locality);
    if (continent != '') result.push(continent);
    if (region != '') result.push(region);
    if (metro != '') result.push(metro);
    if (name != '') result.push(name);

    const uniqueList = [...new Set(result)];
    return uniqueList.join(', ');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { vendorId } = req.body;

    const { data: vendor, error: fetchError } = await supabase
      .from('tblvendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (fetchError || !vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const text = buildVendorText(vendor);
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });

    const embedding = response.data[0].embedding;

    await supabase
      .from('tblvendors')
      .update({ embedding })
      .eq('id', vendorId);

    res.status(200).json({ success: true, embeddingLength: embedding.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
}