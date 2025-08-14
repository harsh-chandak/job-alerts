import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

/* ---- Compact Pagination ---- */
function Pagination({ totalPages, currentPage, onChange }) {
    if (!totalPages || totalPages <= 1) return null;

    const getPages = () => {
        const pages = [];
        const windowSize = 2;
        const start = Math.max(2, currentPage - windowSize);
        const end = Math.min(totalPages - 1, currentPage + windowSize);

        pages.push(1);
        if (start > 2) pages.push("…");
        for (let p = start; p <= end; p++) pages.push(p);
        if (end < totalPages - 1) pages.push("…");
        if (totalPages > 1) pages.push(totalPages);

        return pages;
    };

    return (
        <nav className="flex items-center justify-center gap-2 mt-4">
            <button
                onClick={() => onChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                Prev
            </button>

            {getPages().map((p, i) =>
                p === "…" ? (
                    <span key={`dots-${i}`} className="px-2 text-gray-500">…</span>
                ) : (
                    <button
                        key={`currentPage-${p}`}
                        onClick={() => onChange(p)}
                        aria-current={p === currentPage ? "true" : "false"}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                onClick={() => onChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                Next
            </button>
        </nav>
    );
}

export default function Jobs() {
    const [jobs, setJobs] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ status: '', search: '', start: '', end: '' });

    const router = useRouter();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(30);

    const fetchJobs = async () => {
        try {
            setLoading(true);

            const res = await axios.get('/api/jobs/get-all', {
                params: {
                    ...filters,
                    onlyApplications: true,
                    currentPage: currentPage,
                    itemsPerPage: itemsPerPage
                },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            console.log(
                'currentPage/itemsPerPage ->',
                currentPage,
                itemsPerPage,
                'total ->',
                res.data?.pagination?.total
            );

            setJobs(res.data.data || []);
            setTotalItems(res.data?.pagination?.total || 0);
            setTotalPages(res.data?.pagination?.totalPages || 1);
            setLoading(false);
        } catch (err) {
            setLoading(false);
            if (err.response?.status === 403 || err.response?.status === 401) {
                localStorage.clear();
                router.push('/');
            } else {
                setError('Failed to fetch Jobs');
            }
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [currentPage, itemsPerPage, filters]);

    const markAsApplied = async (id) => {
        try {
            await axios.put(
                '/api/jobs/update',
                { id, update: { status: 'applied', applied_on: new Date() } },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            fetchJobs();
        } catch (err) {
            if (err.response?.status === 403 || err.response?.status === 401) {
                localStorage.clear();
                router.push('/');
            } else {
                setError('Failed to update the job');
            }
        }
    };

    const handlePageSizeChange = (e) => {
        const newSize = Number(e.target.value);
        setItemsPerPage(newSize);
        setCurrentPage(1);
    };

    const updateJob = async (id, update) => {
        try {
            setLoading(true)
            await axios.put(
                '/api/jobs/update',
                { id, update },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            fetchJobs();
            setLoading(false)
        } catch (err) {
            setLoading(false)
            if (err.response?.status === 403 || err.response?.status === 401) {
                localStorage.clear();
                router.push('/');
            } else {
                setError('Failed to update the job');
            }
        }
    };

    const pageSizeOptions = [10, 30, 50, 100];

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

            {loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : (
                <>
                    {
                        jobs.length === 0 ? (
                            <p className="text-center text-gray-500">No applications found.</p>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                                    <div>
                                        Showing{" "}
                                        <span className="font-medium">
                                            {totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0}
                                        </span>
                                        {"–"}
                                        <span className="font-medium">
                                            {Math.min(currentPage * itemsPerPage, totalItems)}
                                        </span>{" "}
                                        of <span className="font-medium">{totalItems}</span>

                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>Rows per Page:</span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => {
                                                setLimit(Number(e.target.value));
                                                setPage(1);
                                            }}
                                            className="border rounded px-2 py-1"
                                        >
                                            {pageSizeOptions.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {jobs.map((app) => (
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
                                ))}

                                <Pagination
                                    totalPages={totalPages}
                                    currentPage={currentPage}
                                    onChange={handlePageSizeChange}
                                />
                            </>
                        )
                    }
                </>
            )}
        </div>
    );
}
