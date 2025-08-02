// src/pages/settings.js
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Settings() {
    const router = useRouter();
    const [profile, setProfile] = useState({ name: '', email: '', mongo_uri: '', discord_uri: '', slug: '' });
    const [passwords, setPasswords] = useState({ old_password: '', new_password: '' });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const fetchProfile = async () => {
        try {
            const res = await axios.get('/api/auth/profile', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setProfile({
                name: res.data.data.name,
                email: res.data.data.email,
                mongo_uri: res.data.data.mongo_uri,
                discord_uri: res.data.data.discord_uri,
                slug: res.data.data.slug,
            });
        } catch {
            localStorage.clear()
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleUpdateProfile = async () => {
        try {
            const res = await axios.put('/api/auth/update-profile', profile, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            setMessage('✅ Profile updated successfully');
        } catch (err) {
            if (err.response?.status === 403) {
                // ✅ Redirect to login if auth failed
                localStorage.clear()
                router.push('/');
            } else {
                setMessage('❌ Failed to update profile');
            }
        }
    };

    const handleChangePassword = async () => {
        try {
            const res = await axios.put('/api/auth/reset-password', passwords, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            setMessage('🔒 Password changed successfully');
        } catch (err){
            if (err.response?.status === 403 ) {
                // ✅ Redirect to login if auth failed
                localStorage.clear()
                router.push('/');
            } else {
                setMessage('❌ Failed to change password');
            }
        }
    };

    const handleLogout = async () => {
        try {
            localStorage.clear()
            router.push('/');
        } catch {
            alert('Logout failed');
        }
    };

    if (loading) return <p className="p-6 text-center">Loading profile...</p>;

    return (
        <main className="max-w-2xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-bold">⚙️ Account Settings</h1>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold">Profile Info</h2>
                <Input
                    type="text"
                    placeholder="Name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
                <Input
                    type="email"
                    placeholder="Email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
                <Input
                    type="mongo_uri"
                    placeholder="MongoDB URL"
                    value={profile.mongo_uri}
                    onChange={(e) => setProfile({ ...profile, mongo_uri: e.target.value })}
                />
                <Input
                    type="discord_uri"
                    placeholder="Discord Webhook Endpoint"
                    value={profile.discord_uri}
                    onChange={(e) => setProfile({ ...profile, discord_uri: e.target.value })}
                />
                <Button onClick={handleUpdateProfile}>Update Profile</Button>
            </section>
            <section className="space-y-2 pt-2">
                <label className="text-sm font-medium">🔗 Cronjob API Endpoint</label>
                <Input
                    type="text"
                    readOnly
                    value={`${process.env.NEXT_PUBLIC_DEPLOYED_ON}/api/${profile.slug}/scrape`}
                    className="cursor-text bg-gray-100"
                />
            </section>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold">Change Password</h2>
                <Input
                    type="password"
                    placeholder="Old Password"
                    value={passwords.old_password}
                    onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
                />
                <Input
                    type="password"
                    placeholder="New Password"
                    value={passwords.new_password}
                    onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                />
                <Button variant="outline" onClick={handleChangePassword}>Change Password</Button>
            </section>

            <section className="flex justify-between items-center pt-4">
                <span className="text-sm text-gray-500">Signed in as {profile.email}</span>
                <Button variant="destructive" onClick={handleLogout}>Logout</Button>
            </section>

            {message && <p className="text-center text-blue-600 font-medium pt-2">{message}</p>}
        </main>
    );
}