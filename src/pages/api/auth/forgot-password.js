import { masterPromise } from "@/utils/db";
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    try {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
        const db = (await masterPromise()).db("job-alerts");
        const User = db.collection('users');
    
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(403).json({ error: 'Invalid user' });
        if(!user.is_approved) return res.status(403).json({ error: 'User not approved yet' });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
    
        await User.updateOne(
            { _id: user._id },
            { $set: { otp, otpExpiry } }
        );
    
        // Send email
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });
    
        const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb; color: #111827;">
          <div style="max-width: 500px; margin: auto; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.06);">
            <h2 style="color: #111827;">🔐 Password Reset OTP</h2>
            <p style="font-size: 16px;">Use the following OTP to reset your password. This OTP is valid for <strong>5 minutes</strong>.</p>
            <div style="font-size: 28px; font-weight: bold; margin: 20px 0; text-align: center; letter-spacing: 4px; color: #2563eb;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #6b7280;">If you didn’t request this, you can ignore this email.</p>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">Sent at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
        `;
    
        await transporter.sendMail({
            to: user.email,
            subject: 'Your OTP for Password Reset',
            html,
        });
    
        return res.status(200).json({ message: 'OTP sent to email' });
    } catch (error) {
        console.error(error)
        return res.status(500).json({data:error, message:"Internal Server Error"})
    }
}
