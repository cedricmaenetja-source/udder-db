export function authorize(req, res){
    // Attempt to get the origin of the request.
    // - origin: sent in most browser-based CORS requests
    // - referer: fallback if origin is missing
    // - default to empty string if neither exists
    const origin = req.headers.origin || req.headers.referer || '';

    // Get the host (domain) of the current server.
    // This represents the domain that received the request.
    const host = req.headers.host;

    // SECURITY CHECK:
    // Ensure the request is coming from the same domain.
    // If the origin/referer does NOT include our host, block the request.
    // This is a basic protection against cross-site requests.
    if (!origin.includes(host)) {
        // Return HTTP 403 Forbidden if validation fails
        return res.status(403).json({ error: 'Forbidden' });
    }

    // If the check passes, allow the request to continue.
    // (No return here means the calling handler proceeds)
}
