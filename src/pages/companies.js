import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';

/* ---- Compact Pagination (ellipses) ---- */
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
        "px-3 py-1 rounded border text-sm aria-[current=true]:bg-blue-500 aria-[current=true]:text-white";
    const ghostBtn =
        "px-3 py-1 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <nav className={`flex items-center justify-center gap-2 mt-4 ${className}`} aria-label="Pagination">
            <button
                className={ghostBtn}
                onClick={() => onChange(currentPage - 1)}
                disabled={currentPage === 1}
                type="button"
                aria-label="Previous Page"
            >
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
                        aria-label={`Go to page ${p}`}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                className={ghostBtn}
                onClick={() => onChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                type="button"
                aria-label="Next Page"
            >
                Next
            </button>
        </nav>
    );
}

export default function Companies() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Pagination state (frontend)
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(30); // default 30

    // From backend or fallback
    const [totalItems, setTotalItems] = useState(0);
    const [serverPaginated, setServerPaginated] = useState(false);

    const router = useRouter();

    const fetchCompanies = async () => {
        try {
            setLoading(true);

            const res = await axios.get('/api/companies/get-all', {
                params: {
                    page: currentPage || 1,
                    limit: itemsPerPage || 30,
                },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                }
            });

            const data = res.data?.data || [];
            const pag = res.data?.pagination;

            setCompanies(data);
            setServerPaginated(Boolean(pag));
            setTotalItems(
                (typeof res.data?.totalItems === 'number' && res.data.totalItems) ??
                (typeof res.data?.total === 'number' && res.data.total) ??
                data.length
            );

            setLoading(false);
        } catch (err) {
            setLoading(false);
            if (err.response?.status === 403 || err.response?.status === 401) {
                localStorage.clear();
                router.push('/');
            } else {
                setError('Failed to fetch Companies');
            }
        }
    };

    useEffect(() => {
        fetchCompanies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, itemsPerPage]);

    // When backend doesn't paginate, slice on the client
    const currentCompanies = useMemo(() => {
        if (serverPaginated) return companies; // already paginated by backend
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return companies.slice(start, end);
    }, [companies, currentPage, itemsPerPage, serverPaginated]);

    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    // Clamp currentPage if itemsPerPage changes or total changes
    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const goToPage = (pageNumber) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const handlePageSizeChange = (e) => {
        const newSize = Number(e.target.value);
        setItemsPerPage(newSize);
        setCurrentPage(1);
    };

    const pageSizeOptions = [10, 30, 50, 100];

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">📋 All Companies</h1>

            {loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : (
                <>
                    {/* Controls row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div className="text-sm text-gray-600">
                            Showing{" "}
                            <span className="font-medium">
                                {totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0}
                            </span>
                            {"–"}
                            <span className="font-medium">
                                {Math.min(currentPage * itemsPerPage, totalItems)}
                            </span>{" "}
                            of <span className="font-medium">{totalItems}</span>
                            {!serverPaginated && (
                                <span className="ml-2 text-xs text-gray-500">(client-paginated)</span>
                            )}
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                            <span className="text-gray-700">Rows per page:</span>
                            <select
                                value={itemsPerPage}
                                onChange={handlePageSizeChange}
                                className="border rounded px-2 py-1"
                            >
                                {pageSizeOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="overflow-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left">Name</th>
                                    <th className="px-4 py-2 text-left">Careers URL</th>
                                    <th className="px-4 py-2 text-left">Custom API</th>
                                    <th className="px-4 py-2 text-left">Mapping</th>
                                    <th className="px-4 py-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {currentCompanies.map(company => (
                                    <tr key={company._id}>
                                        <td className="px-4 py-2 font-medium">{company.name}</td>
                                        <td className="px-4 py-2 text-blue-600 max-w-xs truncate">
                                            <a href={company.careersUrl} target="_blank" rel="noreferrer">
                                                {company.careersUrl}
                                            </a>
                                        </td>
                                        <td className="px-4 py-2">{company.customApi ? '✅' : '❌'}</td>
                                        <td className="px-4 py-2">
                                            {company.customApi && (
                                                <pre className="text-xs whitespace-pre-wrap">
                                                    {JSON.stringify(company.responseMapping?.fields || {}, null, 2)}
                                                </pre>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 space-x-2">
                                            <Link
                                                href={`/companies/view/${company._id}`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 rounded hover:bg-indigo-100 hover:text-indigo-700 transition"
                                            >
                                                👁️ View
                                            </Link>
                                            <Link
                                                href={`/companies/delete/${company._id}`}
                                                className="px-2 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
                                            >
                                                Delete
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        totalPages={totalPages}
                        currentPage={currentPage}
                        onChange={goToPage}
                    />
                </>
            )}
        </div>
    );
}
