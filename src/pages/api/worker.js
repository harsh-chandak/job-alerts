// pages/api/worker.js
import cronHelper from "@/utils/cronHelper";
import { sendFailureDiscordNotification } from "@/utils/failure-notify";

export const config = {
  api: {
    // allow up to 300s if your plan supports it; adjust as needed
    responseLimit: false,
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { slug } = req.query;
  try {
    if (!slug) {
      return res.status(400).json({ ok: false, message: "Missing slug" });
    }

    await cronHelper(slug);   // do DB connect + scrapeAndNotify here
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Worker error:", err);
    await sendFailureDiscordNotification(err, 
        `Worker failed for ${slug} user.`
    )
    return res.status(500).json({ ok: false, error: "Worker failed" });
  }
}
