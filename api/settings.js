import { Redis } from "@upstash/redis";

function createRedis() {
  // If REST API vars exist, use them directly
  if (process.env.KV_REST_API_URL) {
    return new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  // Otherwise parse KV_REDIS_URL: rediss://default:TOKEN@HOSTNAME:PORT
  const redisUrl = process.env.KV_REDIS_URL;
  if (!redisUrl) throw new Error("No Redis env vars found");
  const parsed = new URL(redisUrl);
  return new Redis({
    url: `https://${parsed.hostname}`,
    token: parsed.password,
  });
}

const redis = createRedis();
const KEY = "nk-settings";

export default async function handler(req, res) {
  // GET — anyone can read settings
  if (req.method === "GET") {
    try {
      const data = await redis.get(KEY);
      if (!data) return res.status(200).json(null);
      return res.status(200).json(data);
    } catch (e) {
      console.error("Redis GET error:", e);
      return res.status(500).json({ error: "Failed to load settings" });
    }
  }

  // POST — only admin can save (password check)
  if (req.method === "POST") {
    const { password, settings } = req.body;

    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!settings) {
      return res.status(400).json({ error: "Settings required" });
    }

    try {
      await redis.set(KEY, settings);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("Redis SET error:", e);
      return res.status(500).json({ error: "Failed to save settings" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
