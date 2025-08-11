import axios from 'axios';
import { sendFailureDiscordNotification } from './failure-notify';

const discordWebhook = process.env.DISCORD_NEW_USER_WEBHOOK;

export async function notifyNewUserDiscord({ userName, userSlug }) {
    try {
        const approveUrl = `${process.env.NEXT_PUBLIC_DEPLOYED_ON || 'http://localhost:3000'}/api/${userSlug}/approve`;

        await axios.post(discordWebhook, {
            content: `🚨 **New User Registration Alert**\n\n**User**: ${userName}\n\n👉 [✅ Approve this user](${approveUrl})`,
            flags: 4096, // suppress embeds (previews)
        });
    } catch (err) {
        await sendFailureDiscordNotification(
            err,
            `Failed to send new user approval message on Discord for ${process.env.NEXT_PUBLIC_DEPLOYED_ON}/api/${userSlug}/approve`
        );
    }
}
