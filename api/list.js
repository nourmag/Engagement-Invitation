import { guestDatabase } from "./_lib/guests.js";
import { Redis } from "@upstash/redis";

const redis = new Redis({
    url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    if (!process.env.RSVP_ADMIN_SECRET || req.query.key !== process.env.RSVP_ADMIN_SECRET)
        return res.status(401).json({ success: false, error: "Unauthorized" });

    const rows = [];
    let attending = 0, heads = 0;
    for (const code of Object.keys(guestDatabase)) {
        const rsvp = await redis.get(`rsvp:${code}`);
        const seen = await redis.get(`seen:${code}`);
        if (rsvp && rsvp.status === "attending") { attending++; heads += rsvp.partySize || 0; }
        rows.push({
            code, guestName: guestDatabase[code].guestName, allowedGuests: guestDatabase[code].allowedGuests,
            status: (rsvp && rsvp.status) || "—", partySize: rsvp ? rsvp.partySize : "—",
            respondedAt: (rsvp && rsvp.updatedAt) || "", opened: seen ? "yes" : "no",
        });
    }

    if (req.query.format === "csv") {
        const head = "code,guestName,allowedGuests,status,partySize,respondedAt,opened";
        const body = rows.map((r) => [r.code, `"${String(r.guestName).replace(/<br>/g, " ")}"`, r.allowedGuests, r.status, r.partySize, r.respondedAt, r.opened].join(",")).join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        return res.status(200).send("\uFEFF" + head + "\n" + body); // BOM so Excel reads Arabic
    }
    return res.status(200).json({ success: true, totals: { respondingGuests: attending, totalHeadcount: heads }, rows });
}