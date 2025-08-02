// pages/forgot.js
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';

export default function ForgotPassword() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [status, setStatus] = useState('');
    const router = useRouter()
    const requestOtp = async () => {
        setStatus('📨 Sending OTP...');
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

            setStatus('✅ OTP sent to your email. Check your inbox (valid for 5 minutes)');
            setStep(2);
        } catch (err) {
            setStatus(`❌ ${err.message}`);
        }
    };

    const resetPassword = async () => {
        setStatus('🔒 Resetting password...');
        try {
            const res = await fetch('/api/auth/forgot-pass-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reset password');

            setStatus('✅ Password has been reset successfully. You can now login.');
            router.push('/')
            setStep(1);
            setEmail('');
            setOtp('');
            setNewPassword('');

        } catch (err) {
            setStatus(`❌ ${err.message}`);
        }
    };

    return (
        <main className="flex flex-col items-center justify-center min-h-screen p-6">
            <h1 className="text-3xl font-bold mb-6">🔐 Forgot Password</h1>
            <div className="w-full max-w-sm space-y-4">
                <Input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={step === 2}
                />
                {step === 2 && (
                    <>
                        <Input
                            type="text"
                            placeholder="Enter OTP"
                            value={otp}
                            onChange={e => setOtp(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                    </>
                )}

                {step === 1 ? (
                    <Button className="w-full" onClick={requestOtp}>Send OTP</Button>
                ) : (
                    <Button className="w-full" onClick={resetPassword}>Reset Password</Button>
                )}

                {status && <p className="text-sm text-center text-gray-600">{status}</p>}
            </div>
            <div className="pt-2 text-center">
                <button
                    onClick={() => router.push('/')}
                    className="text-sm text-blue-600 hover:underline"
                >
                    🔙 Back to Login
                </button>
            </div>
        </main>
    );
}
