import { rm } from "node:fs/promises";
import { CLIP_MANIFEST_PATH } from "./clips.shared";

// Clear the clip manifest at the start of each Playwright invocation so
// stale entries from a previous run don't leak into the collector.
export default async function globalSetup() {
  await rm(CLIP_MANIFEST_PATH, { force: true });
}
