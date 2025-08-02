import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Companies() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;  // You can change this
    const router = useRouter()
    const fetchCompanies = async () => {
        try {
            const res = await axios.get('/api/companies/get-all', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                }
            });
            setCompanies(res.data.data);
            setLoading(false);
        } catch (err) {
            setLoading(false);
            if (err.response?.status === 403 || err.response?.status === 401) {
                // ✅ Redirect to login if auth failed
                localStorage.clear()
                router.push('/');
            } else {
                setError('Failed to fetch Companies');
            }
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/companies/delete?id=${id}`);
            setCompanies(prev => prev.filter(c => c._id !== id));
        } catch (err) {
            console.error('❌ Failed to delete company:', err.message);
        }
    };
    // Calculate indexes for current page slice
    const indexOfLastJob = currentPage * itemsPerPage;
    const indexOfFirstJob = indexOfLastJob - itemsPerPage;
    const currentCompanies = companies.slice(indexOfFirstJob, indexOfLastJob);

    const totalPages = Math.ceil(companies.length / itemsPerPage);

    const goToPage = (pageNumber) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };
    return (

        <div className="p-6 max-w-6xl mx-auto">
            <script src="https://cdn.tailwindcss.com"></script>
            <h1 className="text-3xl font-bold mb-6">📋 All Companies</h1>
            {loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : (
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
            )}
            {/* Pagination controls */}
            <div className="flex justify-center mt-4 space-x-2">
                <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border disabled:opacity-50"
                >
                    Prev
                </button>

                {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    return (
                        <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`px-3 py-1 rounded border ${page === currentPage ? 'bg-blue-500 text-white' : ''
                                }`}
                        >
                            {page}
                        </button>
                    );
                })}

                <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        </div>

    );
}
