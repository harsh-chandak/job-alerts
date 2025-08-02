import { masterPromise } from "@/utils/db";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    try {
        const db = (await masterPromise()).db("job-alerts");
        const User = db.collection('users')
    
        if (req.method !== 'POST') return res.status(405).end();
    
        const { email, password } = req.body;
        const user = await User.findOne({ email });
    
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
    
        if(!user.is_approved) return res.status(401).json({ error: 'User not approved yet' });
        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '365d' });
    
        res.status(200).json({ token, user: { id: user._id, email: user.email, username: user.username } });
    } catch (error) {
        console.error(error)
        res.status(500).json({data:error, message:"Internal Server Error"})
    }
}
