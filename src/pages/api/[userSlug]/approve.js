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
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #0070f3;">Hello ${userName},</h2>
    <p>We’re pleased to inform you that your account has been <strong>approved</strong> and you can now start using our platform.</p>
    <p>Feel free to log in and explore the features we offer.</p>
    <br />
    <p style="font-size: 0.9em; color: #555;">Best regards,<br/>The Job Alerts Team</p>
  </div>
  `;

    await transporter.sendMail({
        to: toEmail,
        subject: "Your Account Has Been Approved!",
        html,
    });
}
