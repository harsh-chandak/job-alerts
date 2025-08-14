// pages/api/[userSlug]/scrape.js
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userSlug } = req.query;

  // Build absolute base URL (works on Vercel + local dev)
  const base =
    process.env.NEXT_PUBLIC_DEPLOYED_ON ||
    (process.env.NEXT_PUBLIC_DEPLOYED_ON ? `https://${process.env.NEXT_PUBLIC_DEPLOYED_ON}` : "http://localhost:3000");

  // Fire the worker route and DO NOT await it. The worker is a separate invocation.
  fetch(`${base}/api/worker?slug=${encodeURIComponent(userSlug)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source: "cron" }),
  }).catch(() => { /* swallow */ });

  // Return immediately so cron-job.org gets a fast success
  return res.status(202).json({ message: "Accepted. Scrape started." });
}
