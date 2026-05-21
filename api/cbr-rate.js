import { getCbrRate } from "./_cbr.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const result = await getCbrRate();
  if (result) return res.status(200).json(result);
  return res.status(502).json({ error: "Failed to fetch CBR rate" });
}
