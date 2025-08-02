// pages/api/auth/forgot-pass-reset.js

import { masterPromise } from "@/utils/db";
import bcrypt from "bcrypt";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = (await masterPromise()).db("job-alerts");
    const User = db.collection("users");

    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const user = await User.findOne({ email });

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(403).json({ error: "OTP not requested or expired" });
    }
    if(!user.is_approved) return res.status(401).json({ error: 'User not approved yet' });

    const now = Date.now();
    if (user.otp !== otp) {
      return res.status(401).json({ error: "Invalid OTP" });
    }

    if (user.otpExpiry < now) {
      return res.status(410).json({ error: "OTP has expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { otp: "", otpExpiry: "" }, // remove otp after reset
      }
    );

    return res.status(200).json({ message: "🔒 Password has been successfully reset." });
  } catch (err) {
    console.error("Password reset error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
