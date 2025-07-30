import axios from 'axios';

/**
 * Scrapes Oracle job listings from their public HCM API
 * @param {Set<string>} sentIdSet
 * @param {object} constraints
 */
export async function scrapeOracleJobs(sentIdSet, constraints) {
    const newJobs = [];
    const fullUrl = `https://eeho.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.workLocation,requisitionList.otherWorkLocations,requisitionList.secondaryLocations,flexFieldsFacet.values,requisitionList.requisitionFlexFields&finder=findReqs;siteNumber=CX_45001,facetsList=LOCATIONS;WORK_LOCATIONS;WORKPLACE_TYPES;TITLES;CATEGORIES;ORGANIZATIONS;POSTING_DATES;FLEX_FIELDS,limit=50,lastSelectedFacet=AttributeChar6`;



    try {
        const res = await axios.get(fullUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Node.js Scraper)',
            },
        }).then(res => {
            const jobs = res.data?.items[0]?.requisitionList || [];
            for (const job of jobs) {
                const title = job.Title || '';
                const location = job.WorkLocation || job.PrimaryLocation || '';
                const id = job.Id || '';
                const postingDate = job.PostingDate || '';
                const url = `https://eeho.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_45001/job/${id}`;

                const fullText = `${title} ${location}`.toLowerCase();

                if (!sentIdSet.has(url) && matchesConstraints(fullText, constraints)) {
                    newJobs.push({
                        title,
                        location,
                        url,
                        postingDate,
                        company: 'Oracle',
                    });
                }
            }
        }).catch(err => {
            console.error("Oracle Error", err, err?.response)
        });


    } catch (err) {
        console.error('❌ Oracle API error:', err.message);
    }
    return newJobs;
}

function matchesConstraints(text, constraints) {
    const hasInclude = constraints.include.some(word => text.includes(word));
    const hasLocation = constraints.location.some(word => text.includes(word));
    const hasExclude = constraints.exclude.some(word => text.includes(word));
    return hasInclude && hasLocation && !hasExclude;
}
