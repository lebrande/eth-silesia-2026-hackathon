const MAIN_URL = process.env.MAIN_URL ?? "http://localhost:3000";

async function main() {
  console.log(`[cron] Health check at ${MAIN_URL}`);

  try {
    const response = await fetch(`${MAIN_URL}/api/health`);

    if (!response.ok) {
      console.error(`[cron] Failed: ${response.status} ${response.statusText}`);
      process.exit(1);
    }

    const data = await response.json();
    console.log(`[cron] OK:`, data);
  } catch (error) {
    console.error(
      `[cron] Error:`,
      error instanceof Error ? error.message : error,
    );
  }

  process.exit(0);
}

main();
