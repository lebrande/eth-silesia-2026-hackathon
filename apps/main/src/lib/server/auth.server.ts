import { NextRequest } from "next/server";

export function validateApiKey(request: NextRequest): Response | null {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.API_SECRET_KEY;

  if (!expectedKey) {
    console.error("API_SECRET_KEY not configured");
    return Response.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (apiKey !== expectedKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
