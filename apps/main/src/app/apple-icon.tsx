import { readFile } from "fs/promises";
import path from "path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const file = await readFile(
    path.join(process.cwd(), "src/branding/apple-icon.png"),
  );
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": contentType },
  });
}
