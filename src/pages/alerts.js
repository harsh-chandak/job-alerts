import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';

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
            key={`page-${p}`}
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

  const router = useRouter();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  const fetchJobs = async () => {
    try {
      setLoading(true);

      const res = await axios.get('/api/jobs/get-all', {
        params: {
          page: currentPage,
          limit: itemsPerPage
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      console.log(
        'page/limit ->',
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
  }, [currentPage, itemsPerPage]);

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📋 All Jobs</h1>

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
                {jobs.length ? (currentPage - 1) * itemsPerPage + 1 : 0}
              </span>
              {"–"}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </span>{" "}
              of <span className="font-medium">{totalItems}</span>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-700">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={handlePageSizeChange}
                className="border rounded px-2 py-1"
              >
                {[10, 30, 50, 100].map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Company</th>
                  <th className="px-4 py-2 text-left">Job Title</th>
                  <th className="px-4 py-2 text-left">Sent On</th>
                  <th className="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {jobs.map((job) => {
                  const isNotApplied = !job?.status;
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
                          className={`${!isNotApplied ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
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

          <Pagination
            totalPages={totalPages}
            currentPage={currentPage}
            onChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
