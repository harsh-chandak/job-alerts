import axios from "axios";
import chunk from "lodash.chunk";
import { sendFailureDiscordNotification } from "./failure-notify";

const MAX_EMBEDS = 10;

export async function followUpDiscord(DISCORD_WEBHOOK_URL, followUps = [], user) {
  if (!DISCORD_WEBHOOK_URL) {
    throw new Error("❌ Missing follow-up Discord webhook in user profile");
  }

  if (!followUps.length) return;

  const batches = chunk(followUps, MAX_EMBEDS);

  for (const batch of batches) {
    const embeds = batch.map(job => ({
      title: `🔁 Follow-up: ${job.title}`,
      description: `Revisit opportunity at **${job.company}** for ${job.title}`,
      color: 0xFAA61A,
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
          value: job.career_page || 'Not provided',
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "⏱️ Auto Follow-up Reminder",
        icon_url: "https://cdn-icons-png.flaticon.com/512/3281/3281289.png"
      }
    }));

    try {
      await axios.post(DISCORD_WEBHOOK_URL, { embeds });
    } catch (err) {
      await sendFailureDiscordNotification(
        err,
        `❗ Error while sending follow-up notification for User: ${user?.name}`
      );
    }

    await new Promise(resolve => setTimeout(resolve, 2000)); // slight delay to avoid rate limiting
  }
}
