const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN?.trim();
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID?.trim();

type SlackApiResponse = {
  ok: boolean;
  error?: string;
};

function clean(value: string | null | undefined, max = 300): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function postSlackMessage(text: string, channel: string | null | undefined): Promise<boolean> {
  if (!SLACK_BOT_TOKEN || !channel) {
    return false;
  }

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, text }),
    });

    const payload = (await response.json().catch(() => ({ ok: false }))) as SlackApiResponse;
    if (!response.ok || !payload.ok) {
      console.error("Slack notification failed", {
        status: response.status,
        error: payload.error ?? "unknown_error",
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Slack notification network error", error);
    return false;
  }
}

export async function notifySlack(text: string): Promise<boolean> {
  return postSlackMessage(text, SLACK_CHANNEL_ID);
}

export async function notifyError(
  route: string,
  message: string,
  detail?: string,
): Promise<boolean> {
  const parts = [`🚨 *Error* in \`${clean(route, 120)}\``, clean(message, 250)];
  if (detail) {
    parts.push(`\`\`\`${clean(detail, 500)}\`\`\``);
  }
  return postSlackMessage(parts.join("\n"), SLACK_CHANNEL_ID);
}
