import cron from 'node-cron';
import * as timeClockService from './time-clock.service.js';

/**
 * Initializes the cron job for auto clock-out at the end of the day.
 * Scheduled to run every day at 23:55 (11:55 PM).
 * Adjust the timezone if necessary (e.g., 'Asia/Kolkata').
 */
export function initAutoClockOutJob() {
    // Run every day at 23:55 to catch everyone before midnight
    console.log('🕒 Initializing Auto Clock-Out Cron Job...');

    cron.schedule('55 23 * * *', async () => {
        console.log('⏳ Running Auto Clock-Out Job for end of the day...');
        try {
            const activeEntries = await timeClockService.getAllActiveEntries();

            if (!activeEntries || activeEntries.length === 0) {
                console.log('✅ No active entries found. Auto clock-out skipped.');
                return;
            }

            console.log(`🔍 Found ${activeEntries.length} active entries to auto clock-out.`);

            let successCount = 0;
            let failureCount = 0;

            for (const entry of activeEntries) {
                try {
                    await timeClockService.clockOut(entry.user_id, 'System Auto Clock Out at End of Day');
                    successCount++;
                    console.log(`✅ System auto clocked out user: ${entry.user_email || entry.user_id}`);
                } catch (err) {
                    failureCount++;
                    console.error(`❌ Failed to auto clock out user ${entry.user_email || entry.user_id}:`, err.message);
                }
            }

            console.log(`🏁 Auto Clock-Out summary: ${successCount} successful, ${failureCount} failed.`);
        } catch (error) {
            console.error('❌ Error during Auto Clock-Out Job execution:', error);
        }
    }, {
        timezone: "Asia/Kolkata" // Based on the user's location in Bengaluru
    });

    console.log('✅ Auto Clock-Out Cron Job initialized (Schedule: 23:55 Asia/Kolkata)');
}
