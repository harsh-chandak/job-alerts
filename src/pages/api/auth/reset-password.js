import { withAuth } from "@/utils/server/auth";
import { masterPromise } from "@/utils/db";
import bcrypt from 'bcrypt';
import { ObjectId } from "mongodb";

async function handler(req, res) {
    try {
        const db = (await masterPromise()).db("job-alerts");
        const User = db.collection('users')

        const { old_password, new_password } = req.body;

        const user = await User.findOne({ _id: new ObjectId(req.user._id) });

        if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

        if (!(await bcrypt.compare(old_password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        user.password = await bcrypt.hash(new_password, 10);
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {

    }
}

export default withAuth(handler)