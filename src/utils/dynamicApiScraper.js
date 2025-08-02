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
    const { name, careersApi, params, responseMapping, method = "GET" , careersUrl} = companyConfig;
    const { jobsPath, fields } = responseMapping;
    const newJobs = [];

    try {
        const response = await axios({ method, url: careersApi, params });
        const jobs = deepGet(response.data, jobsPath) || [];
        for (const job of jobs) {
            const title = deepGet(job, fields.title);
            
            const id = String(deepGet(job, fields.id));
            const location = deepGet(job, fields.location) || "";
            const description = deepGet(job, fields.description) || "";

            if (!title || !id) continue;
            const fullText = `${title} ${location} ${description}`.toLowerCase();
            
            if (!await db.collection("sentJobs").findOne({id: id, company: name })) {
                if  (matchesConstraints(fullText, constraints)){
                    newJobs.push({ title, id, location, company: name , career_page: careersUrl});
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
    const hasInclude = constraints.include.some(w => text.includes(w));
    const hasLocation = constraints.location.some(w => text.includes(w));
    const hasExclude = constraints.exclude.some(w => text.includes(w));
    return hasInclude && hasLocation && !hasExclude;
}
