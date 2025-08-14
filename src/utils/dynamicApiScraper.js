// utils/dynamicApiScraper.js
import axios from 'axios';
import { sendFailureDiscordNotification } from './failure-notify';

function deepGet(obj, path) {
    if (!path) return undefined;
    return path.split('.').reduce((acc, part) => {
        if (!acc) return undefined;
        // Check for array index, e.g. "items[0]"
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
            const [, arrayKey, index] = arrayMatch;
            return acc[arrayKey]?.[Number(index)];
        }
        return acc[part];
    }, obj);
}


function slugify(text = "") {
    return text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

export async function scrapeGenericApiCompany(companyConfig, db, constraints, user) {
    const { name, careersApi, params, responseMapping, method = "GET", careersUrl, headers } = companyConfig;
    const { jobsPath, fields } = responseMapping;
    const newJobs = [];

    const params_obj = {}

    for (let i = 0; i < params?.length; i++) {
        const { key, value, enabled } = params[i];

        if (enabled) {
            // Any extra ops can go here before setting
            const processedValue = value.trim();
            params_obj[key.trim()] = processedValue;
        }
    }

    const headers_obj = {}

    for (let i = 0; i < headers?.length; i++) {
        const { key, value, enabled } = headers[i];

        if (enabled) {
            // Any extra ops can go here before setting
            const processedValue = value.trim();
            headers_obj[key.trim()] = processedValue;
        }
    }

    try {
        const send_obj = { method, url: careersApi }
        if (params?.length)send_obj[params] = params_obj
        if (headers?.length)send_obj[headers] = headers_obj
        const response = await axios(send_obj);
        const jobs = deepGet(response.data, jobsPath) || [];
        for (const job of jobs) {
            const title = deepGet(job, fields.title);

            const id = String(deepGet(job, fields.id));
            const location = deepGet(job, fields.location) || "";
            const description = deepGet(job, fields.description) || "";

            if (!title || !id) continue;
            const fullText = `${title} ${location} ${description}`.toLowerCase();

            if (!await db.collection("sentJobs").findOne({ id: id, company: name })) {
                if (matchesConstraints(fullText, constraints)) {
                    newJobs.push({ title, id, location, company: name, career_page: careersUrl });
                }
            }
        }
    } catch (err) {
        console.error(err)
        console.error(`❌ Failed to scrape ${name}:`, err.message);
        await sendFailureDiscordNotification(err, `Error in sending jobs for ${name} with custom API for ${user.name} user.`)
    }
    return newJobs;
}

function matchesConstraints(text, constraints) {
    const norm = arr => (arr || []).map(w => w.trim().toLowerCase());

    const includeList = norm(constraints.include);
    const locationList = norm(constraints.location);
    const excludeList = norm(constraints.exclude);

    const hasInclude = includeList.some(word => text.includes(word));
    const hasLocation = locationList.some(word => text.includes(word));
    const hasExclude = excludeList.some(word => text.includes(word));

    return hasInclude && hasLocation && !hasExclude;
}
