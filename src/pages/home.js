import { useState, useEffect } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { Plus, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Layout from '@/components/layout';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/router';

const ReactJson = dynamic(() => import('react18-json-view'), {
    ssr: false,
});

export default function Home() {
    const resetForm = () => {
        setJsonFile(null);
        setCompany({
            name: '',
            careersUrl: '',
            customApi: false,
            careersApi: '',
            params: [{ key: '', value: '', enabled: true }],
            headers: [{ key: '', value: '', enabled: true }]
        });
        setMapping({
            jobsPath: '',
            titlePath: '',
            idPath: '',
            locationPath: '',
            descriptionPath: '',
        });
        setRawResponse(null);
    };

    const router = useRouter()
    const [jsonFile, setJsonFile] = useState(null);
    const [message, setMessage] = useState('');

    const [company, setCompany] = useState({
        name: '',
        careersUrl: '',
        customApi: false,
        careersApi: '',
        params: [{ key: '', value: '', enabled: true }],
        headers: [{ key: '', value: '', enabled: true }]
    });
    const [rawResponse, setRawResponse] = useState(null);
    const [mapping, setMapping] = useState({
        jobsPath: '',
        titlePath: '',
        idPath: '',
        locationPath: '',
        descriptionPath: '',
    });
    const [status, setStatus] = useState('');
    const fetchProfile = async () => {
        try {
            const res = await axios.get('/api/auth/profile', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
        } catch (err) {
            if (err.response?.status === 423) {
                setMessage('❌ Demo user can not access this.');

            }
            else if (err.response?.status === 403) {
                localStorage.clear();
                router.push('/');
            } else {
                setMessage('❌ Failed to fetch profile');
                localStorage.clear()
                router.push('/');
            }
        }
    };

    const handleJsonUpload = async () => {
        if (!jsonFile) return;
        const formData = new FormData();
        formData.append('file', jsonFile);
        setStatus('Uploading JSON...');
        try {
            const res = await axios.post('/api/upload', formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                }
            });
            setStatus(res.data.message);
            resetForm();
        } catch (err) {
            if (err.response?.status === 403 || err.response?.status === 401) {
                // ✅ Redirect to login if auth failed
                localStorage.clear()
                router.push('/');
            } else {
                console.error(err)
                setStatus('❌ Upload failed');
            }
        }
    };

    const handleFetchCustomApi = async () => {
        try {
            const res = await fetch('/api/fetchCompanyApi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    careersApi: company.careersApi,
                    headers: company.headers,
                    params: company.params,
                }),
            });

            if (!res.ok) throw new Error('Failed to fetch from backend');

            const data = await res.json();
            setRawResponse(data);
            setStatus('✅ API response loaded');
        } catch (err) {
            console.error(err);
            setRawResponse(null);
            setStatus('❌ Failed to fetch API response');
        }
    };

    const handleSingleUpload = async () => {
        const payload = {
            name: company.name,
            careersUrl: company.careersUrl,
            customApi: company.customApi,
        };
        if (company.customApi) {
            payload.careersApi = company.careersApi;
            try {
                payload.params = company.params || {}
                payload.headers = company.headers || {}
            } catch (err) {
                console.error(err)
                return setStatus('❌ Invalid params or headers JSON');
            }
            payload.responseMapping = {
                jobsPath: mapping.jobsPath,
                fields: {
                    title: mapping.titlePath,
                    id: mapping.idPath,
                    location: mapping.locationPath,
                    description: mapping.descriptionPath,
                },
            };
        }

        setStatus('Uploading company...');
        try {
            const res = await axios.post('/api/upload', { company: payload }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                }
            });
            setStatus(res.data.message);
            resetForm();
        } catch (err) {
            if (err.response?.status === 403 || err.response?.status === 401) {
                // ✅ Redirect to login if auth failed
                localStorage.clear()
                router.push('/');
            } else {
                console.error(err)
                setStatus('❌ Upload failed');
            }
        }
    };


    const addParam = () => {
        setCompany({
            ...company,
            params: [...company.params, { key: '', value: '', enabled: true }]
        });
    };
    useEffect(() => {
        fetchProfile(); // runs once on mount before rendering
    }, []);
    const removeParam = (index) => {
        const newParams = company.params.filter((_, i) => i !== index);
        setCompany({ ...company, params: newParams });
    };

    const updateParam = (index, field, value) => {
        const newParams = company.params.map((param, i) =>
            i === index ? { ...param, [field]: value } : param
        );
        setCompany({ ...company, params: newParams });
    };

    const addHeader = () => {
        setCompany({
            ...company,
            headers: [...company.headers, { key: '', value: '', enabled: true }]
        });
    };

    const removeHeader = (index) => {
        const newHeaders = company.headers.filter((_, i) => i !== index);
        setCompany({ ...company, headers: newHeaders });
    };

    const updateHeader = (index, field, value) => {
        const newHeaders = company.headers.map((header, i) =>
            i === index ? { ...header, [field]: value } : header
        );
        setCompany({ ...company, headers: newHeaders });
    };

    const getQueryParamsAsJSON = () => {
        const enabledParams = company.params.filter(p => p.enabled && p.key);
        const paramsObj = {};
        enabledParams.forEach(param => {
            paramsObj[param.key] = param.value;
        });
        return JSON.stringify(paramsObj, null, 2);
    };

    const getHeadersAsJSON = () => {
        const enabledHeaders = company.headers.filter(h => h.enabled && h.key);
        const headersObj = {};
        enabledHeaders.forEach(header => {
            headersObj[header.key] = header.value;
        });
        return JSON.stringify(headersObj, null, 2);
    };

    const checkScrapingMethod = async () => {
        setStatus('🔍 Analyzing careers page...');
        try {
            const res = await axios.post('/api/check-method', {
                url: company.careersUrl,
            });
            const { apiFound, apiUrls, containsJobText, error } = res.data;

            if (error) return setStatus(`❌ ${error}`);

            if (containsJobText) {
                setStatus(`✅ Web scraping possible (No API detected, but jobs text found)`);
            } else if (apiFound) {
                setStatus(`✅ API detected: ${apiUrls[0] || 'Check console for full list'}`);
            } else {
                setStatus(`⚠️ Unable to auto-detect jobs — may need manual inspection`);
            }

        } catch (err) {
            console.error(err);
            setStatus('❌ Error analyzing page');
        }
    };
    const handleTryScraping = async () => {
        if (!company.careersUrl) return setStatus("❌ Enter a careers URL first");

        setStatus("🔍 Scraping page via Puppeteer...");

        try {
            const res = await axios.post('/api/try-puppeteer', {
                url: company.careersUrl,
            });

            if (res.data.success) {
                setStatus("✅ Page scraped successfully. See preview below.");
                setRawResponse({ scrapedText: res.data.content });
            } else {
                setStatus("❌ Scraping failed");
            }
        } catch (err) {
            setStatus("❌ Scraping failed or blocked");
            console.error(err);
        }
    };
    return (
        <main className="p-6 max-w-4xl mx-auto space-y-6">

            <h1 className="text-3xl font-bold text-center">🚀 Job Tracker Configurator</h1>

            {/* Bulk Upload */}
            {/* Single Upload Instructions */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <h2 className="text-xl font-semibold">📝 Instructions for Single Company Upload</h2>
                    <ol className="list-decimal text-sm text-gray-700 pl-5 space-y-2">
                        <li>
                            Go to the <strong>company career page</strong> you want to scrape job data from, and copy the URL.
                        </li>
                        <li>
                            Paste that URL in the <strong>Careers URL</strong> field below and click the{" "}
                            <em>🧪 Try Scraping Page</em> button to test if the job data loads correctly.
                        </li>
                        <li>
                            If you successfully get job data, great! You can proceed directly to submission. <br />
                            Otherwise, enable the <em>Custom API</em> option and find the company’s public API endpoint and parameters manually.
                        </li>
                        <li>
                            Use the Postman-like section to add query parameters and headers, then click{" "}
                            <em>Test API and Load Response</em> to verify the data.
                        </li>
                        <li>
                            In the <strong>Response Mapping</strong> section, write the JSON paths exactly as they appear. <br />
                            <span className="text-xs text-gray-500">
                                Example: if jobs are at <code>res.data.jobs.acquisitions[0].list</code>, enter that path precisely.
                            </span>
                        </li>
                        <li>
                            Once your configuration works, go to <strong>Settings</strong> to find your personal{" "}
                            <em>Cronjob API Endpoint</em>. <br />
                            Use this URL to create a cronjob on{" "}
                            <a
                                href="https://cron-job.org"
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline"
                            >
                                cron-job.org
                            </a>.
                        </li>
                        <li className="text-amber-700 font-semibold">
                            Important: Set your cronjob interval to <strong>no less than 30 minutes</strong> to avoid account suspension.
                        </li>
                    </ol>
                </CardContent>
            </Card>

            {/* Single Company */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <h2 className="text-xl font-semibold">➕ Add Company (Single)</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            placeholder="Company Name"
                            value={company.name}
                            onChange={(e) => setCompany({ ...company, name: e.target.value })}
                        />
                        <Input
                            placeholder="Careers URL"
                            value={company.careersUrl}
                            onChange={(e) => setCompany({ ...company, careersUrl: e.target.value })}
                        />
                    </div>

                    <Label className="flex items-center space-x-2 mt-2">
                        <input
                            type="checkbox"
                            checked={company.customApi}
                            onChange={(e) => setCompany({ ...company, customApi: e.target.checked })}
                        />
                        <span>Enable Custom API</span>
                    </Label>

                    {company.customApi && (
                        <div className="space-y-4 mt-4">
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    API Endpoint
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="https://api.example.com/careers"
                                    value={company.careersApi}
                                    onChange={(e) => setCompany({ ...company, careersApi: e.target.value })}
                                />
                            </div>

                            {/* Query Parameters */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-gray-700">
                                        Query Parameters
                                    </label>
                                    <button
                                        onClick={addParam}
                                        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                    >
                                        <Plus size={14} />
                                        Add Parameter
                                    </button>
                                </div>

                                <div className="border border-gray-200 rounded-md overflow-hidden">
                                    <div className="grid grid-cols-12 gap-0 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        <div className="col-span-1 p-3 text-center">Enable</div>
                                        <div className="col-span-4 p-3">Key</div>
                                        <div className="col-span-6 p-3">Value</div>
                                        <div className="col-span-1 p-3 text-center">Action</div>
                                    </div>

                                    {company.params.map((param, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-0 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                                            <div className="col-span-1 p-3 flex justify-center items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={param.enabled}
                                                    onChange={(e) => updateParam(index, 'enabled', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="col-span-4 p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Parameter key"
                                                    value={param.key}
                                                    onChange={(e) => updateParam(index, 'key', e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="col-span-6 p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Parameter value"
                                                    value={param.value}
                                                    onChange={(e) => updateParam(index, 'value', e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="col-span-1 p-3 flex justify-center items-center">
                                                <button
                                                    onClick={() => removeParam(index)}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                    disabled={company.params.length === 1}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Headers */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-gray-700">
                                        Headers
                                    </label>
                                    <button
                                        onClick={addHeader}
                                        className="flex items-center gap-1 px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                                    >
                                        <Plus size={14} />
                                        Add Header
                                    </button>
                                </div>

                                <div className="border border-gray-200 rounded-md overflow-hidden">
                                    <div className="grid grid-cols-12 gap-0 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600 uppercase tracking-wider">
                                        <div className="col-span-1 p-3 text-center">Enable</div>
                                        <div className="col-span-4 p-3">Key</div>
                                        <div className="col-span-6 p-3">Value</div>
                                        <div className="col-span-1 p-3 text-center">Action</div>
                                    </div>

                                    {company.headers.map((header, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-0 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                                            <div className="col-span-1 p-3 flex justify-center items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={header.enabled}
                                                    onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="col-span-4 p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Header key"
                                                    value={header.key}
                                                    onChange={(e) => updateHeader(index, 'key', e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="col-span-6 p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Header value"
                                                    value={header.value}
                                                    onChange={(e) => updateHeader(index, 'value', e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="col-span-1 p-3 flex justify-center items-center">
                                                <button
                                                    onClick={() => removeHeader(index)}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                    disabled={company.headers.length === 1}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Preview JSON Output */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Query Parameters JSON</h3>
                                    <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-auto max-h-48">
                                        {getQueryParamsAsJSON()}
                                    </pre>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Headers JSON</h3>
                                    <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-auto max-h-48">
                                        {getHeadersAsJSON()}
                                    </pre>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="bg-yellow-400 text-black hover:bg-yellow-500"
                                onClick={handleFetchCustomApi}
                            >
                                Test API and Load Response
                            </Button>

                            {rawResponse && (
                                <>
                                    <h3 className="text-sm font-semibold mt-6">Explore JSON Response</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                        {/* Collapsible JSON Viewer */}
                                        <div className="max-h-[400px] overflow-auto border rounded p-2 bg-gray-50">
                                            <ReactJson
                                                src={rawResponse}
                                                collapsed={2}
                                                enableClipboard={false}
                                                displayDataTypes={false}
                                                name={null}
                                            />
                                        </div>

                                        {/* Manual path inputs */}
                                        <div className="space-y-4">
                                            {['jobsPath', 'titlePath', 'idPath', 'locationPath', 'descriptionPath'].map((field) => (
                                                <Input
                                                    key={field}
                                                    placeholder={`Enter for ${field}`}
                                                    value={mapping[field]}
                                                    onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value }))}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <Button
                        onClick={handleTryScraping}
                        variant="outline"
                        className="bg-blue-100 text-black hover:bg-blue-200"
                    >
                        🧪 Try Scraping Page (Puppeteer)
                    </Button>
                    {rawResponse?.scrapedText && (
                        <div className="mt-4">
                            <h3 className="text-sm font-semibold">🧾 Scraped Page Preview</h3>
                            <pre className="p-4 bg-gray-100 border rounded-md max-h-[400px] overflow-auto text-xs whitespace-pre-wrap">
                                {rawResponse.scrapedText}
                            </pre>
                        </div>
                    )}
                    <Button className="w-full bg-green-600 hover:bg-green-700 mt-4" onClick={handleSingleUpload}>
                        Submit Company
                    </Button>
                </CardContent>
            </Card>

            {status && <p className="text-center text-blue-700 font-medium">{status}</p>}
            {message && <p className="text-center text-blue-600 font-medium pt-2">{message}</p>}
        </main>
    );
}
