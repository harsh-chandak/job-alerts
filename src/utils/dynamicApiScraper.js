// utils/dynamicApiScraper.js
import axios from 'axios';
import { sendFailureDiscordNotification } from './failure-notify';
import { matchesConstraints } from './exclusionCheck';

function deepGet(obj, path) {
    if (!path) return undefined;
    return path.split('.').reduce((acc, part) => {
        if (!acc) return undefined;
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
            const [, arrayKey, index] = arrayMatch;
            return acc[arrayKey]?.[Number(index)];
        }
        return acc[part];
    }, obj);
}

function slugify(text = '') {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

export async function scrapeGenericApiCompany(companyConfig, db, user) {
    const { name, careersApi, params, responseMapping, method = 'GET', careersUrl, headers } = companyConfig;
    const { jobsPath, fields } = responseMapping;
    const newJobs = [];

    // Build params object
    const params_obj = {};
    for (let i = 0; i < params?.length; i++) {
        const { key, value, enabled } = params[i] || {};
        if (!enabled) continue;
        if (!key || !key.trim()) continue; // skip invalid or empty header keys
        params_obj[key.trim()] = (value || '').trim();
    }

    // Build headers object
    const headers_obj = {};
    for (let i = 0; i < headers?.length; i++) {
        const { key, value, enabled } = headers[i] || {};
        if (!enabled) continue;
        if (!key || !key.trim()) continue; // skip invalid or empty header keys
        headers_obj[key.trim()] = (value || '').trim();
    }

    try {
        const send_obj = { method, url: careersApi };

        if (Object.keys(params_obj).length) send_obj.params = params_obj;
        if (Object.keys(headers_obj).length) send_obj.headers = headers_obj;

        const response = await axios(send_obj);

        // Handle plain text or HTML APIs
        let data = response.data;
        if (typeof data === 'string') {
            try {
                const match = data.match(/\{.*\}/s);
                if (match) data = JSON.parse(match[0]);
            } catch {
                console.warn(`Could not parse string API response for ${name}`);
            }
        }

        const jobs = deepGet(data, jobsPath) || [];
        for (const job of jobs) {
            const title = deepGet(job, fields.title);
            const id = String(deepGet(job, fields.id));
            const location = deepGet(job, fields.location) || '';
            const description = deepGet(job, fields.description) || '';
            if (!title || !id) continue;
            if (matchesConstraints(title)) {

                const exists = await db.collection('sentJobs').findOne({ id, company: name });

                if (!exists) {
                    newJobs.push({
                        title,
                        id,
                        location,
                        company: name,
                        career_page: careersUrl,
                    });
                }
            }
        }
    } catch (err) {
        console.error(`❌ Failed to scrape ${name}:`, err.message);
        await sendFailureDiscordNotification(
            err,
            `Error scraping ${name} with custom API for ${user.name}`
        );
    }

    return newJobs;
}
