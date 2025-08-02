import bcrypt from "bcrypt";
import { masterPromise } from "@/utils/db";
import { generateSlug } from "@/utils/slugify";
import { notifyNewUserDiscord } from "@/utils/notify-new-user";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Method not allowed" });

    try {
        const db = (await masterPromise()).db("job-alerts");
        const usersCollection = db.collection("users");

        const { name, email, password, mongo_uri, discord_uri } = req.body;

        if (!name || !email || !password || !mongo_uri || !discord_uri) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const baseSlug = generateSlug(name);
        let slug = baseSlug;
        let count = 1;

        while (await usersCollection.findOne({ slug })) {
            slug = `${baseSlug}-${count++}`;
        }

        const existingUser = await usersCollection.findOne({
            $or: [{ email }, { name }],
        });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            name,
            slug,
            email,
            password: hashedPassword,
            createdAt: new Date(),
            mongo_uri,
            discord_uri,
            is_approved: false,
        };

        await usersCollection.insertOne(newUser);

        // Notify on Discord
        await notifyNewUserDiscord({
            userName: name,
            userSlug: slug,
        });

        // Send pending approval email to user
        await sendPendingApprovalEmail(email, name);

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: { name, slug },
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
}

// Email function for pending approval
async function sendPendingApprovalEmail(toEmail, userName) {
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });

    const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #0070f3;">Hello ${userName},</h2>
    <p>Thank you for registering on our platform. Your account is currently <strong>pending approval</strong>.</p>
    <p>Our team will review your registration shortly. You will receive another email once your account has been approved and activated.</p>
    <p>We appreciate your patience!</p>
    <br />
    <p style="font-size: 0.9em; color: #555;">Best regards,<br/>The Job Alerts Team</p>
  </div>
  `;

    await transporter.sendMail({
        to: toEmail,
        subject: "Your Registration is Pending Approval",
        html,
    });
}
