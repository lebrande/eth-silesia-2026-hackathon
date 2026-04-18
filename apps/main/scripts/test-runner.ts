/// <reference types="node" />
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { invokeChatGraph } from "../src/graphs/chat/chat.graph";

export type GraphResult = Awaited<ReturnType<typeof invokeChatGraph>>;

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

export interface TestContext {
  threadId: string;
  send: (message: string) => Promise<GraphResult>;
  log: (text: string) => void;
  assert: (condition: boolean, message: string) => void;
}

export interface TestCase {
  name: string;
  notes?: string;
  run: (ctx: TestContext) => Promise<void>;
}

const SEPARATOR = "\u2500".repeat(60);

export function formatState(result: GraphResult): string {
  const parts: string[] = [];

  if (result.blocked) parts.push("blocked");
  if (result.authStep) parts.push(`authStep=${result.authStep}`);
  if (result.authCode) parts.push(`authCode=${result.authCode}`);
  if (result.verifiedPhone) parts.push(`verified=${result.verifiedPhone}`);
  if (result.widgets && result.widgets.length > 0) {
    parts.push(`widgets=${result.widgets.map((w) => w.type).join(",")}`);
  }

  return parts.length > 0 ? parts.join(", ") : "default";
}

function generateThreadId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createTestContext(
  log: (text: string) => void,
  threadId?: string,
): TestContext {
  const tid = threadId ?? generateThreadId();

  async function send(message: string): Promise<GraphResult> {
    log(`\n  User: ${message}`);
    const result = await invokeChatGraph({ message, threadId: tid });
    log(`  Bot: ${result.message}`);
    log(`  [state: ${formatState(result)}]`);
    return result;
  }

  function assert(condition: boolean, message: string) {
    if (condition) {
      log(`  PASS: ${message}`);
    } else {
      log(`  FAIL: ${message}`);
      throw new AssertionError(message);
    }
  }

  return { threadId: tid, send, log, assert };
}

export async function runTests(tests: TestCase[], filePrefix: string) {
  const outputLines: string[] = [];
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function log(text: string) {
    console.log(text);
    outputLines.push(text);
  }

  const filter = process.argv[2];
  let cases = tests;

  if (filter) {
    cases = tests.filter((t) =>
      t.name.toLowerCase().includes(filter.toLowerCase()),
    );
    if (cases.length === 0) {
      log(`No test cases matching "${filter}"`);
      log("Available: " + tests.map((t) => t.name).join(", "));
      process.exit(1);
    }
  }

  log(`Running ${cases.length} test case(s)...`);

  for (const test of cases) {
    log(`\n${SEPARATOR}`);
    log(`TEST: ${test.name}`);
    if (test.notes) log(`Notes: ${test.notes}`);

    const ctx = createTestContext(log);
    log(`Thread: ${ctx.threadId}`);

    try {
      await test.run(ctx);
      results.push({ name: test.name, passed: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`  ERROR: ${message}`);
      results.push({ name: test.name, passed: false, error: message });
    }
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  log(`\n${SEPARATOR}`);
  log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`);

  if (failed > 0) {
    log("\nFailed tests:");
    for (const r of results.filter((r) => !r.passed)) {
      log(`  - ${r.name}: ${r.error}`);
    }
  }

  log(`\nCheck LangSmith for detailed traces.`);

  const resultsDir = join(import.meta.dirname, "results");
  mkdirSync(resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filePath = join(resultsDir, `${filePrefix}-${timestamp}.txt`);
  writeFileSync(filePath, outputLines.join("\n") + "\n", "utf-8");
  console.log(`Results saved to ${filePath}`);

  if (failed > 0) process.exit(1);
}
