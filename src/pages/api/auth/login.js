import { masterPromise } from "@/utils/db";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    try {
        if (req.method !== 'POST') return res.status(405).end();

        const db = (await masterPromise()).db("job-alerts");
        const User = db.collection('users');

        const { email, password, demo } = req.body;

        let user;

        // if (demo) {
        //     // 🔹 Login as demo user (read-only)
        //     const demoEmail = process.env.DEMO_EMAIL;
        //     user = await User.findOne({ email: demoEmail });

        //     if (!user) {
        //         return res.status(404).json({ error: 'Demo user not found' });
        //     }
        // } else {
            // 🔹 Normal login flow
            user = await User.findOne({ email });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            if (!user.is_approved) {
                return res.status(401).json({ error: 'User not approved yet' });
            }
        // }

        // Add a "readOnly" flag to the payload if it's a demo account
        const payload = { id: user._id, email: user.email, readOnly: !!demo };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '365d' });

        res.status(200).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                readOnly: !!demo
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
