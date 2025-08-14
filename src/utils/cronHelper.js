// utils/cronHelper.js
import { masterPromise } from "@/utils/db";
import { scrapeAndNotify } from "@/utils/scrapper";
import { MongoClient } from "mongodb";
import { sendFailureDiscordNotification } from "./failure-notify";

export default async function cronHelper(userSlug) {
  let client;
  try {
    const masterDb = (await masterPromise()).db("job-alerts");
    const user = await masterDb.collection("users").findOne({ slug: userSlug });

    if (!user || !user.mongo_uri) {
      console.warn(`[cronHelper] user not found or missing mongo_uri: ${userSlug}`);
      return;
    }

    client = new MongoClient(user.mongo_uri);
    await client.connect();
    const userDb = client.db("job-alerts");

    await scrapeAndNotify({ method: "GET" }, userDb, user);
  } catch (err) {
    try { await sendFailureDiscordNotification(err, `Scraping went wrong for ${userSlug} user.`); } catch {}
    throw err;
  } finally {
    if (client) { try { await client.close(); } catch {} }
  }
}
