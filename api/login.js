import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { serialize } from "cookie";
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    const { email, password } = req.body;

    const { data, error } = await supabase
    .from('tblusers')
    .select('id, password, role, requires_otp, email')
    .eq('email', email)
    .eq('verified', 'Y')
    .eq('active', true)
    .maybeSingle();

    if (error) return res.status(500).json({ data: null, error: error.message });

    if (data !== null){
        const match = await bcrypt.compare(password, data.password);
        if (!match){
            return res.status(401).json({ data: null, error: 'Invalid login details.' });
        }

        const token = crypto.randomUUID();
        const { data: sessionData, error: sessionError } = await supabase
            .from('tblsessions')
            .insert({
                session_id: token,
                user_id: data.id
            })
            .select('*');

        res.setHeader("Set-Cookie", serialize("auth", token, {
            httpOnly: true,
            secure: req.headers.host.includes('localhost') ? false : true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7 // 7 days
        }));
        
        if (data.requires_otp){
            const otp = Math.floor(100000 + Math.random() * 900000);
            const access_token = jwt.sign(
                {otp: otp, user_id: data.id},
                process.env.JWT_SECRET,
                { expiresIn: '30m' }
            );

            data['token'] = access_token;
        }

        delete data.password;

        return res.status(200).json({ data });
    }

    return res.status(401).json({ data: null, error: 'Invalid login details.' });
}