import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    // if already has a valid session, skip
    const existing = req.cookies.auth;
    if (existing) {
        const { data } = await supabase
            .from('tblsessions')
            .select('user_id')
            .eq('session_id', existing)
            .maybeSingle();
        if (data) return res.status(200).json({ ok: true });
    }
    
    // create anonymous session
    const sessionId = crypto.randomUUID();
    const resp = await supabase.from('tblsessions').insert({ 
        session_id: sessionId, 
        user_id: null
    });

    res.setHeader('Set-Cookie', `auth=${sessionId}; HttpOnly; Path=/; SameSite=Strict`);
    return res.status(200).json({ ok: true });
}