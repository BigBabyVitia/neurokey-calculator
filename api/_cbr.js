import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const CACHE_KEY = "cbr-usd-rate";
const TTL_SECONDS = 3600; // 1 час

// Возвращает { rate, date, stale? } или null, если и ЦБ упал, и в кэше пусто.
export async function getCbrRate() {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached && cached.rate) return cached;
  } catch (e) {
    console.error("CBR cache read error:", e);
  }

  try {
    const r = await fetch("https://www.cbr-xml-daily.ru/daily_json.js");
    if (!r.ok) throw new Error(`CBR responded ${r.status}`);
    const data = await r.json();
    const usd = data?.Valute?.USD;
    if (!usd?.Value) throw new Error("USD not found in CBR response");

    const fresh = { rate: usd.Value, date: data.Date?.slice(0, 10) || null };
    try {
      await redis.set(CACHE_KEY, fresh, { ex: TTL_SECONDS });
    } catch (e) {
      console.error("CBR cache write error:", e);
    }
    return fresh;
  } catch (e) {
    console.error("CBR fetch error:", e);
    return null;
  }
}
