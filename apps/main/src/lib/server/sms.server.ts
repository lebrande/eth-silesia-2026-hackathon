const BULKGATE_URL = "https://portal.bulkgate.com/api/1.0/simple/transactional";

// --- Override: send all SMS to this number instead of the real recipient ---
// const SMS_OVERRIDE_NUMBER = "48692260261";
const SMS_OVERRIDE_NUMBER = null;
// ---------------------------------------------------------------------------

// --- Whitelist: only these numbers can receive SMS ---
const SMS_ALLOWED_NUMBERS: string[] = [
  "48889930616",
  "48517703749",
  "48731044940",
];
// ------------------------------------------------------

interface BulkGateSuccess {
  data: { status: string; sms_id: string; number: string };
}

interface BulkGateError {
  type: string;
  code: number;
  error: string;
}

type BulkGateResponse = BulkGateSuccess | BulkGateError;

export async function sendSms(
  phone: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (process.env.SMS_MOCK === "true") {
    console.log(`[sms][MOCK] Would send to ${phone}: ${text}`);
    return { ok: true };
  }

  const appId = process.env.BULKGATE_APP_ID;
  const appToken = process.env.BULKGATE_API_KEY;

  if (!appId || !appToken) {
    console.warn(
      "[sms] BULKGATE_APP_ID or BULKGATE_API_KEY not set, skipping SMS",
    );
    return { ok: false, error: "SMS not configured" };
  }

  const targetNumber = SMS_OVERRIDE_NUMBER ?? phone;

  if (!SMS_ALLOWED_NUMBERS.includes(targetNumber)) {
    console.warn(`[sms] Number ${targetNumber} not in whitelist, skipping SMS`);
    return { ok: false, error: "Number not whitelisted" };
  }

  console.log(
    `[sms] Sending to ${targetNumber}${SMS_OVERRIDE_NUMBER ? ` (override, real: ${phone})` : ""}`,
  );

  try {
    const res = await fetch(BULKGATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: appId,
        application_token: appToken,
        number: targetNumber,
        text,
        unicode: true,
        country: "PL",
      }),
    });

    const json = (await res.json()) as BulkGateResponse;

    if ("error" in json) {
      console.error("[sms] BulkGate error:", json.error);
      return { ok: false, error: json.error };
    }

    console.log(`[sms] Sent OK, sms_id: ${json.data.sms_id}`);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sms] Failed to send:", message);
    return { ok: false, error: message };
  }
}
