import { masterPromise } from "@/utils/db";
import { sendFailureDiscordNotification } from "@/utils/failure-notify";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { userSlug } = req.query;

    try {
        const db = (await masterPromise()).db("job-alerts");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({ slug: userSlug });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.is_approved) {
            return res.status(400).json({ error: "User is already approved" });
        }

        await usersCollection.updateOne(
            { slug: userSlug },
            { $set: { is_approved: true, approvedAt: new Date() } }
        );

        await sendApprovalEmail(user.email, user.name);

        res.status(200).json({ message: `User ${user.name} approved successfully.` });
    } catch (error) {
        console.error("Error approving user:", error);
        await sendFailureDiscordNotification(error, `Error while approving the ${user.name} user.`)
        res.status(500).json({ error: "Internal Server Error" });
    }
}

async function sendApprovalEmail(toEmail, userName) {
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
            We’re pleased to inform you that your account has been <strong style="color: #059669;">approved</strong> and you can now start using our platform.
        </p>
        <p style="font-size: 16px;">
            Feel free to log in and explore the features we offer.
        </p>

        <hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd;" />

        <h3 style="color: #444; margin-bottom: 12px;">Important Reminder:</h3>
        <ul style="font-size: 14px; color: #555; padding-left: 20px; margin-top: 0;">
            <li>Please ensure <code style="background:#eaeaea; padding:2px 6px; border-radius:4px;">0.0.0.0/0</code> is added to the <strong>IP Access List</strong> in your MongoDB Atlas cluster's Network Access settings to allow connections.</li>
            <li>Double-check your environment variables (like <code>mongo_uri</code>) are correctly configured in your deployment platform (e.g., Vercel).</li>
            <li>If you haven't already, keep your authentication token secure and do not share it publicly.</li>
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
        subject: "Your Account Has Been Approved!",
        html,
    });
}
