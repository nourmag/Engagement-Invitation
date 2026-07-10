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
        const { code, status, partySize } = req.body || {};
        const cleanCode = String(code || "").trim();
        if (!cleanCode) return res.status(400).json({ success: false, error: "Invitation code is required" });

        const guest = guestDatabase[cleanCode];
        if (!guest) return res.status(404).json({ success: false, error: "كود الدعوة غير صحيح، يرجى التأكد وإعادة المحاولة" });

        if (!["attending", "declined", "maybe"].includes(status))
            return res.status(400).json({ success: false, error: "Invalid RSVP status" });

        const max = Number(guest.allowedGuests) || 0;
        let size = 0;
        if (status === "attending") {
            size = Number(partySize);
            // VALIDATION: must be a whole number between 0 and the guest's allowed max
            if (!Number.isInteger(size) || size < 0 || size > max) {
                return res.status(400).json({ success: false, error: `عدد الحاضرين يجب أن يكون بين ٠ و ${max}` });
            }
        }

        const record = {
            code: cleanCode, guestName: guest.guestName, status,
            partySize: size, allowedGuests: max, updatedAt: new Date().toISOString(),
        };
        await redis.set(`rsvp:${cleanCode}`, record);
        return res.status(200).json({ success: true, rsvp: record });
    } catch (err) {
        console.error("Backend Error:", err);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}