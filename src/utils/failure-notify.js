// src/utils/notify.js
import axios from 'axios';

export async function sendFailureDiscordNotification(error, context = 'Unknown context') {
    const discordWebhook = process.env.DISCORD_FAILURE_WEBHOOK;

    if (!discordWebhook) {
        console.warn('⚠️ DISCORD_FAILURE_WEBHOOK is not defined in environment');
        return;
    }

    try {
        const errorMessage = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));

        await axios.post(discordWebhook, {
            content: [
                `🚨 **[Failure Alert]**`,
                `**Context:** ${context}`,
                `**Error:**`,
                `\`\`\`js\n${errorMessage}\n\`\`\``,
                `🕒 **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
            ].join('\n')
        });
    } catch (err) {
        console.error('❌ Failed to send error notification to Discord:', err.message);
    }
}
