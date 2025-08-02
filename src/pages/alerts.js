import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';

export default function Jobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const router = useRouter();
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;  // You can change this
    const fetchJobs = async () => {
        try {
            const res = await axios.get('/api/jobs/get-all', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setJobs(res.data.data);
            setLoading(false);
        } catch (err) {
            setLoading(false);

            if (err.response?.status === 403 || err.response?.status === 401) {
                // ✅ Redirect to login if auth failed
                localStorage.clear()
                router.push('/');
            } else {
                setError('Failed to fetch Jobs');
            }
        }
    };
    const markAsApplied = async (id) => {
        try {
            await axios.put('/api/jobs/update', { id, update: { status: 'applied', applied_on: new Date() } }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            fetchJobs();
        } catch (err) {
            if (err.response?.status === 403 || err.response?.status === 401) {
                // ✅ Redirect to login if auth failed
                localStorage.clear()
                router.push('/');
            } else {
                setError('Failed to update the job');
            }
        }
    };
    useEffect(() => {
        fetchJobs();
    }, []);

    // Calculate indexes for current page slice
    const indexOfLastJob = currentPage * itemsPerPage;
    const indexOfFirstJob = indexOfLastJob - itemsPerPage;
    const currentJobs = jobs.slice(indexOfFirstJob, indexOfLastJob);

    const totalPages = Math.ceil(jobs.length / itemsPerPage);

    const goToPage = (pageNumber) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <script src="https://cdn.tailwindcss.com"></script>
            <h1 className="text-3xl font-bold mb-6">📋 All Jobs</h1>
            {loading ? (
                <p>Loading...</p>
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : (
                <>
                    <div className="overflow-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left">Company</th>
                                    <th className="px-4 py-2 text-left">Job Title</th>
                                    <th className="px-4 py-2 text-left">Sent On</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {currentJobs.map((job) => {
                                    const isNotApplied = job.status=="" || job.status==null || !job?.status
                                    return (
                                        <tr key={job._id}>
                                            <td className="px-4 py-2 font-medium">{job.company}</td>
                                            <td className="px-4 py-2 font-medium">{job.title}</td>
                                            <td className="px-4 py-2">
                                                {new Date(job.ts).toLocaleDateString()} @ {new Date(job.ts).toLocaleTimeString()}
                                                <br />
                                                <span className="text-xs text-gray-500">
                                                    Last updated: {new Date(job.ts).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <Button
                                                    onClick={() => markAsApplied(job._id)}
                                                    disabled={!isNotApplied}
                                                    className={`${!isNotApplied
                                                        ? 'bg-gray-400 cursor-not-allowed'
                                                        : 'bg-green-600 hover:bg-green-700'
                                                        }`}
                                                >
                                                    {!isNotApplied ? 'Already Applied' : 'Mark as Applied'}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

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
                </>
            )}
        </div>
    );
}
