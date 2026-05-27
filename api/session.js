import { authorize } from "./header";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  authorize(req, res);
  
  const token = req.cookies.auth;

  const { data: session } = await supabase
      .from('tblsessions')
      .select('user_id')
      .eq('session_id', token)
      .maybeSingle();

  if (!session) {
      return res.status(401).json({ loggedIn: false });
  }

  const { data: user } = await supabase
      .from('tblusers')
      .select('id, email, role, vendor_id')
      .eq('id', session.user_id)
      .single();
  
  // res.setHeader(
  //     'Cache-Control', 
  //     'public, s-maxage=3600, stale-while-revalidate=86400'
  // );

  return res.status(200).json({
      loggedIn: true,
      user
  });
}