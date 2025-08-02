import { masterPromise } from "@/utils/db";
import { withAuth } from "@/utils/server/auth";
import { ObjectId } from "mongodb";

async function handler(req, res) {
    try {
        const db = (await masterPromise()).db("job-alerts");
        const User = db.collection('users')
        const { name, mongo_uri, discoruri } = req.body;
        const updated = await User.findOneAndUpdate(
            { _id: new ObjectId(req.user._id) },
            { $set: { name, mongo_uri, discoruri } },
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