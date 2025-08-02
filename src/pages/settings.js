import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Settings() {
    const router = useRouter();
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        mongo_uri: '',
        discord_uri: '',
        follow_up_discord: '',
        slug: ''
    });
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
                follow_up_discord: res.data.data.follow_up_discord || '',
                slug: res.data.data.slug,
            });
        } catch {
            localStorage.clear();
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
            await axios.put('/api/auth/update-profile', profile, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setMessage('✅ Profile updated successfully');
        } catch (err) {
            if (err.response?.status === 403) {
                localStorage.clear();
                router.push('/');
            } else {
                setMessage('❌ Failed to update profile');
            }
        }
    };

    const handleChangePassword = async () => {
        try {
            await axios.put('/api/auth/reset-password', passwords, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setMessage('🔒 Password changed successfully');
        } catch (err) {
            if (err.response?.status === 403) {
                localStorage.clear();
                router.push('/');
            } else {
                setMessage('❌ Failed to change password');
            }
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        router.push('/');
    };

    if (loading) return <p className="p-6 text-center">Loading profile...</p>;

    return (
        <main className="max-w-2xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-bold">⚙️ Account Settings</h1>

            <section className="space-y-4">
                <h2 className="text-lg font-semibold">Profile Info</h2>

                <div>
                    <label htmlFor="name" className="text-sm font-medium">Name</label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="Name"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                </div>

                <div>
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="Email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                </div>

                <div>
                    <label htmlFor="mongo_uri" className="text-sm font-medium">MongoDB URL</label>
                    <Input
                        id="mongo_uri"
                        type="text"
                        placeholder="MongoDB URL"
                        value={profile.mongo_uri}
                        onChange={(e) => setProfile({ ...profile, mongo_uri: e.target.value })}
                    />
                </div>

                <div>
                    <label htmlFor="discord_uri" className="text-sm font-medium">Discord Webhook Endpoint</label>
                    <Input
                        id="discord_uri"
                        type="text"
                        placeholder="Discord Webhook Endpoint"
                        value={profile.discord_uri}
                        onChange={(e) => setProfile({ ...profile, discord_uri: e.target.value })}
                    />
                </div>

                <div>
                    <label htmlFor="follow_up_discord" className="text-sm font-medium">Discord Follow-up Webhook Endpoint</label>
                    <Input
                        id="follow_up_discord"
                        type="text"
                        placeholder="Discord Follow-up Webhook Endpoint"
                        value={profile.follow_up_discord}
                        onChange={(e) => setProfile({ ...profile, follow_up_discord: e.target.value })}
                    />
                </div>


                <Button onClick={handleUpdateProfile}>Update Profile</Button>
            </section>

            <section className="space-y-2 pt-2">
                <label className="text-sm font-medium">🔗 Cronjob API Endpoint: Set Lookout  for New Openings</label>
                <Input
                    type="text"
                    readOnly
                    value={`${process.env.NEXT_PUBLIC_DEPLOYED_ON}/api/${profile.slug}/scrape`}
                    className="w-full bg-gray-100 px-3 py-2 border rounded text-gray-500 cursor-text"
                    />
            </section>
                    {profile.follow_up_discord ? (
                        <div className="mt-4">
                            <label className="text-sm font-medium">🔗 Cronjob API Endpoint: Set Follow-up Reminders</label>
                            <Input
                                readOnly
                                value={`${process.env.NEXT_PUBLIC_DEPLOYED_ON}/api/${profile.slug}/follow-up`}
                                className="w-full bg-gray-100 px-3 py-2 border rounded text-gray-500 cursor-text"
                            />
                        </div>
                    ) : (
                        <div className="mt-4">
                            <label className="text-sm font-medium">🔗 Cronjob API Endpoint: Set Follow-up Reminders</label>
                            <Input
                                readOnly
                                value={`You have not added discord channel webhook for follow-up updates.`}
                                className="w-full bg-gray-100 px-3 py-2 border rounded text-gray-500 cursor-text"
                            />
                        </div>
                    )}

            <section className="space-y-4">
                <h2 className="text-lg font-semibold">Change Password</h2>

                <div>
                    <label htmlFor="old_password" className="text-sm font-medium">Old Password</label>
                    <Input
                        id="old_password"
                        type="password"
                        placeholder="Old Password"
                        value={passwords.old_password}
                        onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
                    />
                </div>

                <div>
                    <label htmlFor="new_password" className="text-sm font-medium">New Password</label>
                    <Input
                        id="new_password"
                        type="password"
                        placeholder="New Password"
                        value={passwords.new_password}
                        onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                    />
                </div>

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
