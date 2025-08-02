// pages/api/[userSlug]/scrape.js

import { masterPromise } from "@/utils/db";
import { sendFailureDiscordNotification } from "@/utils/failure-notify";
import { scrapeAndNotify } from "@/utils/scrapper"; // accepts `req`, `user`
import { MongoClient } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userSlug } = req.query;


  try {
    // Step 1: Get user from master DB
    const masterDb = (await masterPromise()).db("job-alerts");
    const user = await masterDb.collection("users").findOne({ slug: userSlug });

    if (!user || !user.mongo_uri) {
      return res.status(200).json({ message: "User or mongo_uri not found" });
    }

    // Step 2: Connect to user's tenant DB
    const client = new MongoClient(user.mongo_uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    const userDb = client.db('job-alerts'); // or .db("specific-name") if applicable

    // Step 3: Perform scrape logic
    await scrapeAndNotify(req, userDb, user); // Pass DB and user

    return res.status(200).json({ message: "Scraping complete and notifications sent if any." });
  } catch (err) {
    console.error("❌ Error in /api/[userSlug]/scrape:", err);
    await sendFailureDiscordNotification(err, `Scraping went wrong for ${userSlug} user.`)
    return res.status(500).json({ message: "Something went wrong during scraping." });
  }
}
