import { guestDatabase } from "./_lib/guests.js";
import { Redis } from "@upstash/redis";

const redis = new Redis({
    url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method Not Allowed" });

    try {
        const { code } = req.body || {};
        if (!code) return res.status(400).json({ success: false, error: "Invitation code is required" });

        const cleanCode = String(code).trim();
        const guest = guestDatabase[cleanCode];
        if (!guest) return res.status(404).json({ success: false, error: "كود الدعوة غير صحيح، يرجى التأكد وإعادة المحاولة" });

        // existing RSVP + lightweight access log (never block verify if Redis hiccups)
        let rsvp = null;
        try {
            rsvp = await redis.get(`rsvp:${cleanCode}`);
            const seen = await redis.get(`seen:${cleanCode}`);
            await redis.set(`seen:${cleanCode}`, {
                code: cleanCode, guestName: guest.guestName,
                opens: ((seen && seen.opens) || 0) + 1, lastSeen: new Date().toISOString(),
            });
        } catch (e) { console.error("KV read failed:", e); }

        return res.status(200).json({
            success: true, code: cleanCode,
            guestName: guest.guestName, customMessage: guest.customMessage,
            allowedGuests: guest.allowedGuests, rsvp: rsvp || null,
        });
    } catch (err) {
        console.error("Backend Error:", err);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}