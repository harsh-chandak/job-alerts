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
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #222; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px; background: #fafafa;">
        <h2 style="color: #0070f3; margin-bottom: 16px;">Hello ${userName},</h2>
        <p style="font-size: 16px;">
            Thank you for registering on our platform. Your account is currently <strong style="color: #d97706;">pending approval</strong>.
        </p>
        <p style="font-size: 16px;">
            Our team will review your registration shortly. You will receive another email once your account has been approved and activated.
        </p>
        <p style="font-size: 16px;">
            We appreciate your patience!
        </p>

        <hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd;" />

        <h3 style="color: #444; margin-bottom: 12px;">Important Instructions:</h3>
        <ul style="font-size: 14px; color: #555; padding-left: 20px; margin-top: 0;">
            <li>Please ensure <code style="background:#eaeaea; padding:2px 6px; border-radius:4px;">0.0.0.0/0</code> is added to the <strong>IP Access List</strong> in your MongoDB Atlas cluster's Network Access settings to allow connections.</li>
            <li>Double-check your environment variables (like <code>mongo_uri</code>) are correctly configured in your deployment platform (e.g., Vercel).</li>
            <li>Keep your token secure; do not share it publicly.</li>
        </ul>

        <br />

        <p style="font-size: 14px; color: #666; margin-top: 24px;">
            Best regards,<br />
            <strong>Harsh Chandak</strong><br />
            <a href="https://github.com/harsh-chandak" target="_blank" style="color: #0070f3; text-decoration: none;">GitHub</a> | 
            <a href="https://www.linkedin.com/in/hnchandak/" target="_blank" style="color: #0070f3; text-decoration: none;">LinkedIn</a>
        </p>
    </div>
  `;

    await transporter.sendMail({
        to: toEmail,
        subject: "Your Registration is Pending Approval",
        html,
    });
}
