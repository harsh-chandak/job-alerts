import axios from 'axios';

export async function scrapeMicrosoftJobs(sentIdSet, constraints) {
    const newJobs = [];
    const baseUrl = 'https://gcsservices.careers.microsoft.com/search/api/v1/search';

    let page = 1;
    const pageSize = 50;
    let morePages = true;

    while (morePages) {
        try {
            const res = await axios.get(baseUrl, {
                params: {
                    p: 'Software Engineering',
                    exp: 'Students and graduates',
                    l: 'en_us',
                    pg: page,
                    pgSz: pageSize,
                    o: 'Relevance',
                    flt: true,
                },
            });

            const jobs = res.data?.operationResult?.result?.jobs || [];

            if (jobs.length === 0) {
                morePages = false;
                break;
            }

            for (const job of jobs) {
                const {
                    jobId,
                    title,
                    postingDate,
                    properties: {
                        locations = [],
                        primaryLocation = '',
                        workSiteFlexibility = '',
                        jobType = '',
                        description = '',
                    } = {},
                } = job;

                const location = primaryLocation || (locations[0] || '');
                const slug = encodeURIComponent(title.replace(/\s+/g, '-'));
                const url = `https://jobs.careers.microsoft.com/global/en/job/${jobId}/${slug}`;
                const fullText = `${title} ${location} ${workSiteFlexibility} ${jobType}`.toLowerCase();

                if (!sentIdSet.has(url) && matchesConstraints(fullText, constraints)) {
                    newJobs.push({
                        title,
                        url,
                        location,
                        remote: workSiteFlexibility || 'Unknown',
                        jobType,
                        postingDate,
                        company: 'Microsoft',
                    });
                }
            }

            page++;
        } catch (err) {
            console.error('❌ Microsoft API error:', err.message);
            break;
        }
    }
    return newJobs;
}

function matchesConstraints(text, constraints) {
    const hasInclude = constraints.include.some(word => text.includes(word));
    const hasLocation = constraints.location.some(word => text.includes(word));
    const hasExclude = constraints.exclude.some(word => text.includes(word));
    return hasInclude && hasLocation && !hasExclude;
}
