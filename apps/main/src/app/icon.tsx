import { readFile } from "fs/promises";
import path from "path";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function Icon() {
  const file = await readFile(
    path.join(process.cwd(), "src/branding/icon.png"),
  );
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": contentType },
  });
}
