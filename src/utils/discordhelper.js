import axios from "axios";
import chunk from "lodash.chunk";

const MAX_EMBEDS = 10;
const DISCORD_WEBHOOK_URL = String(process.env.discord_uri)
export async function notifyDiscord(jobs = []) {
  if (!DISCORD_WEBHOOK_URL) throw new Error("Missing DISCORD_WEBHOOK_URL in .env");
  if (!jobs.length) return;

  const batches = chunk(jobs, MAX_EMBEDS); // e.g. [[job1, job2...job10], [job11...]]

  for (const batch of batches) {
    const embeds = batch.map(job => ({
      title: `🚀 ${job.title}`,
      description: `New job opportunity at **${job.company}** as ${job.title}`,
      color: 0x5865F2,
      fields: [
        {
          name: "📋 Job ID",
          value: `\`${job.id || 'N/A'}\``,
          inline: true
        },
        {
          name: "🏢 Company",
          value: job.company || 'Unknown',
          inline: true
        },
        {
          name: "🔗 Career Page URL",
          value: job.career_page || 'N/A',
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Job Alert System",
        icon_url: "https://cdn-icons-png.flaticon.com/512/3281/3281289.png"
      }
    }));

    try {
      await axios.post(DISCORD_WEBHOOK_URL, { embeds });
    } catch (err) {
      console.error(`❌ Failed to send Discord webhook:`, err.message);
      console.error(err?.response?.data);
    }

    // Delay between batches to avoid rate limit (tweak as needed)
    await new Promise(res => setTimeout(res, 2000));
  }
}
