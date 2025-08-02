import { masterPromise } from "@/utils/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
    }
    console.log(decoded)
    const db = (await masterPromise()).db("job-alerts");
    const usersCollection = db.collection("users");

    if (req.method === "GET") {
        try {
            if (typeof decoded.id !== 'string' || !ObjectId.isValid(decoded.id)) {
                return res.status(400).json({ error: 'Invalid company ID format' });
            }
            const objectId = new ObjectId(decoded.id);
            const user = await usersCollection.findOne(
                { _id: objectId },
                { projection: { password: 0 } } // Exclude password
            );

            if (!user) return res.status(200).json({ error: "User not found" });
            if (!user.is_approved) return res.status(403).json({ error: 'User not approved yet' });

            res.status(200).json({ success: true, data: user });
        } catch (err) {
            console.error("GET /profile error:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    }
    else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
