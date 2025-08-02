// pages/api/middleware/auth.js
import jwt from 'jsonwebtoken';
import { masterPromise } from "@/utils/db";
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET;


export async function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const db = (await masterPromise()).db('job-alerts')
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({ _id: new ObjectId(decoded.id) });
        if (!user) return res.status(403).json({ error: 'Forbidden, Invalid User' });
        if (!user.is_approved) return res.status(403).json({ error: 'User not approved yet' });

        req.user = user;
        next();
    } catch (err) {
        console.error("Token verification error:", err);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

export async function getDecodedUser(req) {
    if (!req.user) throw new Error("No user is set. Call verifyToken first.");
    return req.user;
}

export async function getConfig(req) {
    if (req.cachedConfig) {
        return req.cachedConfig;
    }

    const user = await getDecodedUser(req); // gets from the global `decodedUser`
    if (!user) throw new Error("User not decoded");

    // You can fetch more config here or even return the user
    req.cachedConfig = {
        discord_uri: user.discord_uri,
        mongo_uri: user.mongo_uri,
        email: user.email,
        // ...any other properties
    };

    return {
        discord_uri: user.discord_uri,
        mongo_uri: user.mongo_uri,
        email: user.email,
        // ...any other properties
    };
}


export function withAuth(handler) {
    return async (req, res) => {
        await verifyToken(req, res, async () => {
            return handler(req, res);
        });
    };
}