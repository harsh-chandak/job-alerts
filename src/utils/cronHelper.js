import { masterPromise } from "@/utils/db";
import { scrapeAndNotify } from "@/utils/scrapper";
import { MongoClient } from "mongodb";
import { sendFailureDiscordNotification } from "./failure-notify";

export default async function cronHelper(userSlug, req) {
    try {
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

    } catch (err) {
        await sendFailureDiscordNotification(err, `Scraping went wrong for ${userSlug} user.`)
        return res.status(500).json({ message: "Something went wrong during scraping." });
    }
}