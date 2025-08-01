import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function DeleteCompany() {
  const router = useRouter();
  const { id } = router.query;

  const [status, setStatus] = useState('Deleting...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const deleteCompany = async () => {
      try {
        const res = await axios.delete(`/api/companies/delete?id=${id}`);
        if (res.status === 200) {
          setStatus('✅ Company deleted successfully.');
          setTimeout(() => router.push('/companies'), 2000);
        } else {
          setError('Something went wrong while deleting the company.');
        }
      } catch (err) {
        console.error(err);
        setError('❌ Failed to delete company.');
      }
    };

    deleteCompany();
  }, [id, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md border border-gray-200 text-center">
        {error ? (
          <p className="text-red-600 text-lg font-medium">{error}</p>
        ) : (
          <>
            <p className="text-gray-700 text-lg font-medium">{status}</p>
            {!error && <p className="text-sm mt-2 text-gray-500">Redirecting shortly...</p>}
          </>
        )}
      </div>
    </div>
  );
}
