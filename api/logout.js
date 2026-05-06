import { serialize } from "cookie";
import { authorize } from "./header";

export default function handler(req, res) {
  authorize(req, res);

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