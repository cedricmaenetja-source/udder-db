import { authorize } from "./header";

export default async function handler(req, res) {
    authorize(req, res);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const response = await fetch(process.env.ZAPIER_SEND_EMAIL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: req.body
        });

        const data = await response.json();
        
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: 'Request failed' });
    }
}