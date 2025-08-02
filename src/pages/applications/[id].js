import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';

export default function ApplicationDetail() {
    const router = useRouter();
    const { id } = router.query;
    const [app, setApp] = useState(null);

    const fetch = async () => {
        try {
            const res = await axios.get(`/api/jobs/get-one?id=${id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setApp(res.data.data);
        } catch (error) {
            console.error('Failed to fetch application', error);
        }
    };

    const markFollowUpSent = async () => {
        try {
            await axios.put('/api/jobs/update', {
                id,
                update: { lastFollowUp: new Date().toISOString() }
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            fetch();
        } catch (error) {
            console.error('Failed to update follow-up', error);
        }
    };

    useEffect(() => { if (id) fetch(); }, [id]);

    if (!app) return (
        <div className="flex justify-center items-center min-h-screen">
            <p className="text-gray-600 text-lg">Loading application details...</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md my-10">
            {/* Header */}
            <div className="mb-6 border-b pb-4">
                <h1 className="text-3xl font-extrabold text-indigo-700">{app.title}</h1>
                <p className="text-xl text-gray-600 mt-1">{app.company}</p>
            </div>
            <button
                onClick={() => router.push('/applications')}
                className="mb-6 inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 font-medium shadow-sm transition"
            >
                ← Back to Applications
            </button>
            {/* Status & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 text-gray-700">
                <div className="bg-indigo-50 p-4 rounded-lg shadow-sm">
                    <h3 className="font-semibold text-indigo-600 mb-1">Status</h3>
                    <p className={`font-medium ${app.status ? 'text-indigo-800' : 'text-gray-400'}`}>
                        {app.status || 'N/A'}
                    </p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg shadow-sm">
                    <h3 className="font-semibold text-indigo-600 mb-1">Applied On</h3>
                    <p className="font-medium text-indigo-800">
                        {app.applied_on ? new Date(app.applied_on).toLocaleDateString() : 'N/A'}
                    </p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg shadow-sm">
                    <h3 className="font-semibold text-indigo-600 mb-1">Last Follow-Up Sent</h3>
                    <p className="font-medium text-indigo-800">
                        {app.lastFollowUp ? new Date(app.lastFollowUp).toLocaleString() : 'Not yet'}
                    </p>
                </div>
            </div>

            {/* Follow-Up Button */}
            <div className="mb-8">
                <Button
                    onClick={markFollowUpSent}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-md shadow-md transition"
                >
                    Mark Follow-Up Sent
                </Button>
            </div>

            {/* Logs Section */}
            <section>
                <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
                    <span className="mr-2">📜</span> Application Logs
                </h2>
                {app.updates?.length > 0 ? (
                    <ul className="divide-y divide-gray-200 border rounded-md shadow-sm">
                        {app.updates.map((u, i) => (
                            <li key={i} className="p-4 hover:bg-indigo-50 transition">
                                <p>
                                    <span className="font-semibold text-indigo-700">{u.field}</span>{' '}
                                    changed from{' '}
                                    <code className="bg-gray-100 rounded px-1 py-0.5 text-sm">{String(u.previousValue)}</code>{' '}
                                    to{' '}
                                    <code className="bg-gray-100 rounded px-1 py-0.5 text-sm">{String(u.newValue)}</code>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    by <span className="font-medium">{u.changedBy}</span> at{' '}
                                    {new Date(u.timestamp).toLocaleString()}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500 italic">No updates logged for this application.</p>
                )}
            </section>
        </div>
    );
}
