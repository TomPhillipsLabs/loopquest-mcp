#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildTaskBody } from "./body.js";

const BASE_URL = (process.env.LOOPQUEST_BASE_URL || "https://loopquest.tomphillips.uk").replace(/\/+$/, "");
const API_KEY = process.env.LOOPQUEST_API_KEY ?? "";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${API_KEY}`, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

const server = new McpServer({ name: "loopquest", version: "0.2.0" });

server.tool(
  "create_review_task",
  "Send content to LoopQuest for a human to review. Use mode=gate to BLOCK until a human approves (poll get_task_status for the verdict before acting), or mode=monitor to review in the background. Returns the task id, status and expiry.",
  {
    module: z
      .enum(["swiper", "versus", "sorter", "detective", "fixer", "redact", "grounding"])
      .optional()
      .describe(
        "Which review game (default swiper). swiper=approve/flag, versus=pick better of two, sorter=classify, detective=find the error, fixer=confirm/correct fields, redact=mask PII/secrets, grounding=check a claim against its source.",
      ),
    content: z.string().optional().describe("The output to review (Swiper, Detective, Redact; the claim for Grounding if 'claim' is empty)."),
    title: z.string().optional().describe("Short title shown on the review card."),
    claim: z.string().optional().describe("Grounding: the claim/answer to verify against the source."),
    source_text: z.string().optional().describe("Grounding: the source/context the claim must be supported by."),
    choices: z.array(z.string()).optional().describe("Sorter: the bucket options to classify into."),
    mode: z.enum(["gate", "monitor"]).optional().describe("gate blocks until a human approves; monitor reviews without blocking (default monitor)."),
    timeout_seconds: z.number().int().min(30).max(2592000).optional().describe("Gate: apply the fail-closed default if no human decides within this many seconds."),
    on_timeout: z.enum(["escalate", "reject", "approve"]).optional().describe("Gate: action if the timeout passes with no verdict (default escalate, fail-closed)."),
    source: z.string().optional().describe("A label for the originating agent/workflow, shown as a coloured tag."),
    external_id: z.string().optional().describe("Correlation id echoed back in the verdict webhook."),
    callback_url: z.string().optional().describe("Where LoopQuest POSTs the signed verdict."),
    reviews_required: z.number().int().min(1).max(5).optional().describe("How many reviewers must agree."),
  },
  async (args) => {
    const res = await api("/api/v1/tasks", { method: "POST", body: JSON.stringify(buildTaskBody(args)) });
    return { content: [{ type: "text", text: res.body }], isError: !res.ok };
  },
);

server.tool(
  "get_task_status",
  "Check the status and verdict of a LoopQuest review task by id.",
  { task_id: z.string().describe("The task id returned by create_review_task.") },
  async ({ task_id }) => {
    const res = await api(`/api/v1/tasks/${encodeURIComponent(task_id)}`);
    return { content: [{ type: "text", text: res.body }], isError: !res.ok };
  },
);

async function main() {
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error("loopquest-mcp failed:", err);
  process.exit(1);
});
