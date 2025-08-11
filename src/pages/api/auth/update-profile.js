import { masterPromise } from "@/utils/db";
import { withAuth } from "@/utils/server/auth";
import { ObjectId } from "mongodb";

async function handler(req, res) {
    if (req.user?.readOnly) {
        return res.status(423).json({ error: 'Demo accounts are read-only' });
    }
    try {
        const db = (await masterPromise()).db("job-alerts");
        const User = db.collection('users')
        const { name, mongo_uri, discoruri, follow_up_discord } = req.body;
        const updated = await User.findOneAndUpdate(
            { _id: new ObjectId(req.user._id) },
            { $set: { name, mongo_uri, discoruri, follow_up_discord } },
            { returnDocument: 'after' } // returns updated doc
        );

        const user = updated.value;
        res.status(200).json({ message: 'Profile updated', user });
    } catch (err) {
        console.error('Error fetching company by ID:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export default withAuth(handler);