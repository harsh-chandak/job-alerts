import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Applications() {
    const [apps, setApps] = useState([]);
    const [filters, setFilters] = useState({ status: '', search: '', start: '', end: '' });
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    const fetchApps = async () => {
        try {
            const res = await axios.get('/api/jobs/get-all', {
                params: {
                    ...filters,
                    onlyApplications: true,
                    page,
                    limit,
                },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setApps(res.data.data || []);
            setTotalPages(res.data.pagination?.totalPages || 1);
        } catch (err) {
            console.error('Fetch apps error:', err);
        }
    };

    useEffect(() => {
        fetchApps();
    }, [filters, page]);

    const updateJob = async (id, update) => {
        try {
            await axios.put('/api/jobs/update', { id, update, }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            fetchApps();
        } catch (err) {
            console.error('Update job error:', err);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) setPage(newPage);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen rounded-lg shadow-md">
            <h1 className="text-3xl font-extrabold mb-6 text-indigo-700">📋 Applications</h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Input
                    placeholder="Search by title..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="border-indigo-300 focus:ring-indigo-500"
                />
                <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="border border-indigo-300 rounded p-2 focus:ring-indigo-500"
                >
                    <option value="">All Statuses</option>
                    <option value="applied">Applied</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview">Interview</option>
                    <option value="selected">Selected</option>
                    <option value="rejected">Rejected</option>
                    <option value="inactive">Inactive</option>
                    <option value="no-reply">No Reply</option>
                </select>
                <Input
                    type="date"
                    value={filters.start}
                    onChange={(e) => setFilters({ ...filters, start: e.target.value })}
                    className="border-indigo-300 focus:ring-indigo-500"
                />
                <Input
                    type="date"
                    value={filters.end}
                    onChange={(e) => setFilters({ ...filters, end: e.target.value })}
                    className="border-indigo-300 focus:ring-indigo-500"
                />
            </div>

            {apps.length === 0 ? (
                <p className="text-center text-gray-500">No applications found.</p>
            ) : (
                apps.map((app) => (
                    <div key={app._id} className="p-4 mb-4 border border-indigo-200 rounded-lg bg-white shadow-sm">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                            <div>
                                <Link
                                    href={`/applications/${app._id}`}
                                    className="text-xl font-semibold text-indigo-600 hover:underline"
                                >
                                    {app.title}
                                </Link>
                                <p className="text-sm text-gray-600">{app.company}</p>
                            </div>
                            <div className="mt-2 md:mt-0 flex flex-wrap gap-4 items-center text-sm text-gray-700">
                                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-medium uppercase tracking-wide">
                                    {app.status || 'No Status'}
                                </span>
                                {app.applied_on && (
                                    <span className="text-gray-500">
                                        Applied on: {new Date(app.applied_on).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-3 space-x-2 flex flex-wrap">
                            <Button onClick={() => updateJob(app._id, { status: 'shortlisted' })} className="bg-indigo-600 hover:bg-indigo-700">Shortlist</Button>
                            <Button onClick={() => updateJob(app._id, { status: 'interview' })} className="bg-purple-600 hover:bg-purple-700">Interview</Button>
                            <Button onClick={() => updateJob(app._id, { status: 'selected' })} className="bg-green-600 hover:bg-green-700">Select</Button>
                            <Button onClick={() => updateJob(app._id, { status: 'rejected' })} className="bg-red-600 hover:bg-red-700">Reject</Button>
                            <Button onClick={() => updateJob(app._id, { inactive: true })} className="bg-yellow-500 hover:bg-yellow-600">Mark Inactive</Button>
                            <Button onClick={() => updateJob(app._id, { followUp: true })} className="bg-teal-600 hover:bg-teal-700">Follow Up</Button>
                            {app.status && (
                                <Button onClick={() => updateJob(app._id, { $unset: { status: "" } })} className="bg-gray-400 hover:bg-gray-500">Undo Status</Button>
                            )}
                            {app.inactive && (
                                <Button onClick={() => updateJob(app._id, { inactive: false })} className="bg-gray-400 hover:bg-gray-500">Undo Inactive</Button>
                            )}
                            {app.followUp && (
                                <Button onClick={() => updateJob(app._id, { followUp: false })} className="bg-gray-400 hover:bg-gray-500">Undo Follow-Up</Button>
                            )}
                        </div>
                    </div>
                ))
            )}

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
                <Button disabled={page <= 1} onClick={() => handlePageChange(page - 1)} className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50">
                    ← Prev
                </Button>
                <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                </span>
                <Button disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)} className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50">
                    Next →
                </Button>
            </div>
        </div>
    );
}
