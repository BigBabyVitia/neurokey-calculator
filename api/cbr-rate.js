let cache = { rate: null, date: null, ts: 0 };
const TTL = 3600000; // 1 hour

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const now = Date.now();
  if (cache.rate && now - cache.ts < TTL) {
    return res.status(200).json({ rate: cache.rate, date: cache.date });
  }

  try {
    const r = await fetch("https://www.cbr-xml-daily.ru/daily_json.js");
    if (!r.ok) throw new Error(`CBR responded ${r.status}`);
    const data = await r.json();
    const usd = data?.Valute?.USD;
    if (!usd?.Value) throw new Error("USD not found in CBR response");

    cache = { rate: usd.Value, date: data.Date?.slice(0, 10) || null, ts: now };
    return res.status(200).json({ rate: cache.rate, date: cache.date });
  } catch (e) {
    console.error("CBR fetch error:", e);
    if (cache.rate) return res.status(200).json({ rate: cache.rate, date: cache.date, stale: true });
    return res.status(502).json({ error: "Failed to fetch CBR rate" });
  }
}
