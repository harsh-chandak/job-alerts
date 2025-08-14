// pages/api/[userSlug]/scrape.js
import { sendFailureDiscordNotification } from "@/utils/failure-notify";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userSlug } = req.query;
  try {
    cronHelper(userSlug, req)
    res.status(200).json({ message: "Scraping complete and notifications sent if any." });
  } catch (err) {
    console.error("❌ Error in /api/[userSlug]/scrape:", err);
    sendFailureDiscordNotification(err, `Scraping went wrong for ${userSlug} user.`)
    res.status(500).json({ message: "Something went wrong during scraping." });
  }
}
