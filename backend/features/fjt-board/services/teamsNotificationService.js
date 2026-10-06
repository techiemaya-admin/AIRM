const TEAMS_NOTIFICATION_URL =
  `${process.env.TEAMS_BOT_URL}/api/pulse/notify`;

export async function sendTeamsNotification({
  userEmail,
  taskId,
  taskTitle,
  taskKey,
  assignedBy,
  dueDate,
  message,
}) {
  if (!userEmail) {
    console.log(
      '[TeamsNotification] No user email. Skipping notification.'
    );

    return {
      success: false,
      skipped: true,
      message: 'No user email provided',
    };
  }

  try {
    const response = await fetch(
      TEAMS_NOTIFICATION_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pulse-notify-key': process.env.PULSE_NOTIFY_KEY,
        },
        body: JSON.stringify({
          userEmail,
          taskId,
          taskTitle,
          taskKey,
          assignedBy,
          dueDate,
          message,
        }),
      }
    );

    const result = await response.json().catch(() => ({}));

    console.log(
      '[TeamsNotification] Response:',
      response.status,
      result
    );

    return {
      success:
        response.ok && result.success !== false,
      status: response.status,
      result,
    };
  } catch (error) {
    console.error(
      '[TeamsNotification] Failed:',
      error
    );

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to send Teams notification',
    };
  }
}