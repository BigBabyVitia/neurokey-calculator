import Redis from "ioredis";

let redis;
function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.KV_REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      tls: {},
    });
  }
  return redis;
}

const KEY = "nk-settings";

export default async function handler(req, res) {
  const db = getRedis();

  // GET — anyone can read settings
  if (req.method === "GET") {
    try {
      const raw = await db.get(KEY);
      if (!raw) return res.status(200).json(null);
      return res.status(200).json(JSON.parse(raw));
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
      await db.set(KEY, JSON.stringify(settings));
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("Redis SET error:", e);
      return res.status(500).json({ error: "Failed to save settings" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
