import { masterPromise } from '@/utils/db';
import { followUpDiscord } from '@/utils/follow-up-discord-notify';
import { MongoClient } from "mongodb";

export default async function handler(req, res) {
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

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const followUps = await userDb.collection('sentJobs').find({
        followUp: true,
        status: { $exists: true, $ne: 'inactive' },
        createdAt: { $lte: oneMonthAgo },
    }).toArray();


    if (followUps.length) {
        followUpDiscord(String(user.follow_up_discord), followUps, user);
    }

    res.status(200).json({ message: 'Follow-up alerts sent', count: followUps.length });

}
