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
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 30px;">
                <div style="max-width: 480px; margin: auto; background: #ffffff; border-radius: 12px; padding: 30px 40px; box-shadow: 0 8px 20px rgba(0,0,0,0.1); color: #1f2937;">
                    <h2 style="font-size: 28px; font-weight: 700; color: #2563eb; margin-bottom: 16px;">🔐 Password Reset OTP</h2>
                    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                        Use the following <strong>One-Time Password (OTP)</strong> to reset your password. This code is valid for <strong>5 minutes</strong>.
                    </p>
                    <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; text-align: center; padding: 20px 0; margin-bottom: 24px; border-radius: 12px; background: #e0e7ff; color: #1e40af; user-select: all;">
                        ${otp}
                    </div>
                    <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
                        If you didn’t request this password reset, please ignore this email or contact support if you have concerns.
                    </p>
                    <p style="font-size: 12px; color: #9ca3af; text-align: right; margin-top: 32px;">
                        Sent at: ${new Date().toLocaleString()}
                    </p>
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
