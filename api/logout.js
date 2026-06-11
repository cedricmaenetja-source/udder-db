import { serialize } from "cookie";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const token = req.cookies.auth;

  if (token) {
      await supabase
          .from("tblsessions")
          .delete()
          .eq("session_id", token);
  }

  res.setHeader("Set-Cookie", serialize("auth", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(0) // immediate expiry
  }));

  res.status(200).json({ success: true });
}