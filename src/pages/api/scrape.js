// pages/api/scrape.js
import { scrapeAndNotify } from "@/utils/scrapper";
import { withAuth } from "@/utils/server/auth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    scrapeAndNotify(req);
    res.status(200).json({ message: "Scraping complete and notifications sent if any." });
  } catch (error) {
    console.error("❌ Error in /api/scrape:", error);
    res.status(500).json({ message: "Something went wrong during scraping." });
  }
}

export default withAuth(handler)