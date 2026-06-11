import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function requireAuth(req, res) {
    const token = req.cookies.auth;
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return null;
    }

    const { data: session } = await supabase
        .from('tblsessions')
        .select('user_id')
        .eq('session_id', token)
        .maybeSingle();

    if (!session) {
        res.status(401).json({ error: 'Unauthorized' });
        return null;
    }

    return { userId: session.user_id, isAnonymous: !session.user_id };
}