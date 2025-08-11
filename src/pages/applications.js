import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/* ---- Compact Pagination ---- */
function Pagination({ totalPages, currentPage, onChange, className = "" }) {
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

    const pages = getPages();
    const baseBtn =
        "px-3 py-1 rounded border text-sm aria-[current=true]:bg-indigo-500 aria-[current=true]:text-white";
    const ghostBtn =
        "px-3 py-1 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <nav className={`flex items-center justify-center gap-2 mt-4 ${className}`} aria-label="Pagination">
            <button className={ghostBtn} onClick={() => onChange(currentPage - 1)} disabled={currentPage === 1} type="button">
                Prev
            </button>

            {pages.map((p, i) =>
                p === "…" ? (
                    <span key={`dots-${i}`} className="px-2 text-gray-500 select-none">…</span>
                ) : (
                    <button
                        key={`page-${p}`}
                        className={baseBtn}
                        onClick={() => onChange(p)}
                        aria-current={p === currentPage ? "true" : "false"}
                        type="button"
                    >
                        {p}
                    </button>
                )
            )}

            <button className={ghostBtn} onClick={() => onChange(currentPage + 1)} disabled={currentPage === totalPages} type="button">
                Next
            </button>
        </nav>
    );
}

export default function Applications() {
    const [apps, setApps] = useState([]);
    const [filters, setFilters] = useState({ status: '', search: '', start: '', end: '' });

    // pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(30); // default 30

    // backend awareness
    const [serverPaginated, setServerPaginated] = useState(false);
    const [totalItems, setTotalItems] = useState(0);

    const fetchApps = async () => {
        try {
            const res = await axios.get('/api/jobs/get-all', {
                params: {
                    ...filters,
                    onlyApplications: true,
                    page: page || 1,
                    limit: limit || 30,
                },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });

            const data = res.data?.data || [];
            const pag = res.data?.pagination;

            setApps(data);
            setServerPaginated(Boolean(pag));

            // prefer totalItems -> pagination.total -> total -> fallback
            setTotalItems(
                (typeof res.data?.totalItems === 'number' && res.data.totalItems) ??
                (typeof pag?.total === 'number' && pag.total) ??
                (typeof res.data?.total === 'number' && res.data.total) ??
                data.length
            );
        } catch (err) {
            console.error('Fetch apps error:', err);
        }
    };

    useEffect(() => {
        fetchApps();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, page, limit]);

    // If BE didn't paginate, slice locally; else render server page
    const visibleApps = useMemo(() => {
        if (serverPaginated) return apps;
        const start = (page - 1) * limit;
        return apps.slice(start, start + limit);
    }, [apps, page, limit, serverPaginated]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    // Clamp page when total/limit change
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [totalPages, page]);

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) setPage(newPage);
    };

    const updateJob = async (id, update) => {
        try {
            await axios.put(
                '/api/jobs/update',
                { id, update },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            fetchApps();
        } catch (err) {
            console.error('Update job error:', err);
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

            {visibleApps.length === 0 ? (
                <p className="text-center text-gray-500">No applications found.</p>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                        <div>
                            Showing{" "}
                            <span className="font-medium">
                                {totalItems ? (page - 1) * limit + 1 : 0}
                            </span>
                            {"–"}
                            <span className="font-medium">
                                {Math.min(page * limit, totalItems)}
                            </span>{" "}
                            of <span className="font-medium">{totalItems}</span>
                            {!serverPaginated && (
                                <span className="ml-2 text-xs text-gray-500">(client-paginated)</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Rows per page:</span>
                            <select
                                value={limit}
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

                    {visibleApps.map((app) => (
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
                        currentPage={page}
                        onChange={handlePageChange}
                    />
                </>
            )}
        </div>
    );
}
