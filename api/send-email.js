import { requireAuth } from './_auth';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    const { action } = req.query;
    const { to, token, host, otp, body, subject, from, fromName, replyTo, redirect } = req.body;

    let adminOtp = null;
    const session = await requireAuth(req, res);
    if (!session) {
        if (!token){return res.status(401).json({ error: 'Unauthorized' });}
        try{
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log(decoded);
            adminOtp = decoded.otp;
        }catch (err) {
            return res.status(401).json({
                error: 'Invalid or expired token'
            });
        }
    }else{
        if (token){
            try{
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                adminOtp = decoded.otp;
            }catch (err) {
                return res.status(401).json({
                    error: 'Invalid or expired token'
                });
            }
        }
    }

    const VALID_ACTIONS = [
        'resetPassword',
        'otpVerification',
        'leadRespond',
        'adminVerify',
        'resetPasswordLink',
        'resetAdminPassword'
    ];

    if (action && !VALID_ACTIONS.includes(action)) return res.status(400).json({ error: `Unknown action: "${action}". Did you forget to register it in VALID_ACTIONS?` });

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let payload;
    if (action === 'resetPassword'){
        const { data, error } = await supabase
            .from('tblusers')
            .select('id, email')
            .eq('email', to)
            .maybeSingle(); 

        if (error) return res.status(500).json({ data: null, error: error.message });
        if (!data) return res.status(500).json({ data: null, error: 'This email does not exist on our system.' });

        payload = {
            to: to,
            subject: 'Reset Your Password',
            body: RESET_PASSWORD_EMAIL.replace('{{LINK}}', `${host}/password.html?r=${redirect}`) 
        };
    }

    if (action === 'resetAdminPassword'){
        const { data, error } = await supabase
            .from('tblusers')
            .select('id, email')
            .eq('email', to)
            .maybeSingle(); 

        if (error) return res.status(500).json({ data: null, error: error.message });
        if (!data) return res.status(500).json({ data: null, error: 'This email does not exist on our system.' });

        const otp = Math.floor(100000 + Math.random() * 900000);
        const { data: otpUpdate, error: otpError } = await supabase
            .from('tblusers')
            .update({otp: otp})
            .eq('email', to); 

        if (otpError) return res.status(500).json({ data: null, error: otpError.message });

        payload = {
            to: to,
            subject: 'Your Verification Code',
            body: OTP_VERIFICATION_EMAIL_ADMIN.replace('{{OTP_CODE}}', otp) 
        };
    }

    if (action === 'otpVerification'){
        payload = {
            to: to,
            subject: 'Your Verification Code',
            body: OTP_VERIFICATION_EMAIL.replace('{{OTP_CODE}}', otp) 
        };
    }

    if (action === 'leadRespond'){
        payload = {
            to: to,
            subject: subject,
            body: `<p>${body.replace(/\n/g, '<br>')}</p>`,
            fromName: fromName,
            replyTo: replyTo 
        };
    }

    if (action == 'adminVerify'){
        payload = {
            to: to,
            subject: 'Udder DB (Admin) - Your verification code',
            body: `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
                    Your UdderDB admin verification code is inside. It expires in 10 minutes.
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f2ef;padding:40px 16px;">
                    <tr>
                        <td align="center">
                        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid rgba(15,15,15,0.07);">
                    
                            <!-- Header -->
                            <tr>
                            <td style="background-color:#1a1a2e;padding:28px 36px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="font-family:'Poppins',Helvetica,Arial,sans-serif;font-size:19px;font-weight:900;letter-spacing:-0.02em;color:#ffffff;">
                                    Udder<span style="color:#e94560;">DB</span>
                                    </td>
                                    <td align="right">
                                    <span style="display:inline-block;font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;background-color:rgba(233,69,96,0.15);border:1px solid rgba(233,69,96,0.3);color:#e94560;border-radius:4px;padding:4px 8px;font-family:Helvetica,Arial,sans-serif;">
                                        Admin
                                    </span>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            </tr>
                    
                            <!-- Body -->
                            <tr>
                            <td style="padding:40px 36px 8px;">
                                <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#e94560;">
                                Verify identity
                                </p>
                                <h1 style="margin:0 0 16px;font-family:'Poppins',Helvetica,Arial,sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.02em;color:#111110;">
                                Your verification code
                                </h1>
                                <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#4a4a46;">
                                Enter this code to finish signing in to your UdderDB admin account. It's valid for the next 10 minutes.
                                </p>
                            </td>
                            </tr>
                    
                            <!-- OTP code block -->
                            <tr>
                            <td style="padding:0 36px 28px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="background-color:#fafaf9;border:1.5px solid rgba(15,15,15,0.12);border-radius:10px;padding:22px 20px;">
                                    <div style="font-family:'Poppins',Helvetica,Arial,sans-serif;font-size:34px;font-weight:800;letter-spacing:0.28em;color:#111110;">
                                        ${adminOtp}
                                    </div>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            </tr>
                    
                            <!-- Security note -->
                            <tr>
                            <td style="padding:0 36px 32px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(233,69,96,0.05);border:1px solid rgba(233,69,96,0.18);border-radius:8px;">
                                <tr>
                                    <td style="padding:14px 16px;font-size:12.5px;line-height:1.6;color:#4a4a46;">
                                    Didn't request this code? Your password may be compromised — sign in and change it immediately, or contact your platform administrator.
                                    </td>
                                </tr>
                                </table>
                            </td>
                            </tr>
                    
                            <!-- Footer -->
                            <tr>
                            <td style="padding:24px 36px 32px;border-top:1px solid rgba(15,15,15,0.07);">
                                <p style="margin:0 0 4px;font-size:12px;color:#8a8a85;line-height:1.6;">
                                This is an automated message from UdderDB Admin. Every sign-in is logged with timestamp and IP for security purposes.
                                </p>
                            </td>
                            </tr>
                    
                        </table>
                        </td>
                    </tr>
                    </table>`,
        };
    }
    
    try {
        const response = await fetch(ZAPIER_SEND_EMAIL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: 'Request failed' });
    }
}

export const ZAPIER_SEND_EMAIL = 'https://hooks.zapier.com/hooks/catch/25735666/uptnlxt/';
export const RESET_PASSWORD_EMAIL = `
    <p>Hello,<br/><br/>

    To reset your password, click the link below:<br/><br/>

    <strong>{{LINK}}</strong><br/><br/>

    If you did not request this, please report this immediately at support-db@udder.rocks.<br/><br/>

    Thanks,<br/>
    Udder</p>`;

export const OTP_VERIFICATION_EMAIL = `
    <p>Hello,<br/><br/>

    Your One-Time Password (OTP) for verification is:<br/><br/>

    <strong>{{OTP_CODE}}</strong><br/><br/>

    This code will expire in 10 minutes.<br/><br/>

    If you did not request this code, please ignore this email.<br/><br/>

    Thanks,<br/>
    Udder</p>`;

export const OTP_VERIFICATION_EMAIL_ADMIN = `
    <p>Hello,<br/><br/>

    Your One-Time Password (OTP) for verification is:<br/><br/>

    <strong>{{OTP_CODE}}</strong><br/><br/>

    If you did not request this code, please ignore this email.<br/><br/>

    Thanks,<br/>
    Udder</p>`;