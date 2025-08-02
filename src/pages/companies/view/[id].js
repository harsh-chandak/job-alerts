import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function ViewCompany() {
    const router = useRouter();
    const { id } = router.query;

    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;

        const fetchCompany = async () => {
            try {
                const res = await axios.get(`/api/companies/get-one?id=${id}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    }
                });
                setCompany(res.data.data);
            } catch (err) {
                if (err.response?.status === 403 || err.response?.status === 401) {
                    // ✅ Redirect to login if auth failed
                    localStorage.clear()
                    router.push('/');
                } else {
                    setError('Failed to load company');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchCompany();
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-gray-600 text-lg animate-pulse">Loading company...</p>
            </div>
        );
    }

    if (error || !company) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-red-600 text-lg">{error || 'Company not found'}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-6 py-12 bg-gray-50">
            <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-xl p-10 border border-gray-200">
                <h1 className="text-3xl font-bold mb-6 text-indigo-700">🏢 {company.name}</h1>

                <div className="space-y-4">
                    <div>
                        <h2 className="font-semibold text-gray-700">Careers URL:</h2>
                        <div className="max-w-full overflow-x-auto bg-gray-50 rounded px-2 py-1 text-sm text-blue-600 border border-gray-200">
                            <p className="whitespace-nowrap">{company.careersUrl || 'N/A'}</p>
                        </div>
                    </div>

                    <div>
                        <h2 className="font-semibold text-gray-700">Custom API:</h2>
                        <p>{company.customApi ? '✅ Yes' : '❌ No'}</p>
                    </div>

                    {company.customApi && (
                        <>
                            <div>
                                <h2 className="font-semibold text-gray-700">Careers API:</h2>
                                <div className="max-w-full overflow-x-auto bg-gray-50 rounded px-2 py-1 text-sm text-blue-600 border border-gray-200">
                                    <p className="whitespace-nowrap">{company.careersApi || 'N/A'}</p>
                                </div>
                            </div>

                            <div>
                                <h2 className="font-semibold text-gray-700">Query Params:</h2>
                                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                                    {JSON.stringify(company.params || {}, null, 2)}
                                </pre>
                            </div>

                            <div>
                                <h2 className="font-semibold text-gray-700">Headers:</h2>
                                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                                    {JSON.stringify(company.headers || {}, null, 2)}
                                </pre>
                            </div>

                            <div>
                                <h2 className="font-semibold text-gray-700">Response Mapping:</h2>
                                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                                    {JSON.stringify(company.responseMapping || {}, null, 2)}
                                </pre>
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-10 flex gap-4">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                        🔙 Back
                    </button>
                </div>
            </div>
        </div>
    );
}
