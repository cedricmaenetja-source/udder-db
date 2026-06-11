import { requireAuth } from './_auth';

export default async function handler(req, res) {
    const session = await requireAuth(req, res);
    if (!session) return;

    const { action } = req.query;

    const VALID_ACTIONS = [
        'resetPassword',
        'otpVerification',
        'leadRespond'
    ];

    if (action && !VALID_ACTIONS.includes(action)) return res.status(400).json({ error: `Unknown action: "${action}". Did you forget to register it in VALID_ACTIONS?` });

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { to, token, host, otp, body, subject, from, fromName, replyTo } = req.body;

    let payload;
    if (action === 'resetPassword'){
        payload = {
            to: to,
            subject: 'Reset Your Password',
            body: RESET_PASSWORD_EMAIL.replace('{{LINK}}', `${host}/password.html?t=${token}`) 
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

    This link will expire in 1 hour.<br/><br/>

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