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

const server = new McpServer({ name: "loopquest", version: "0.1.1" });

server.tool(
  "create_review_task",
  "Send content to LoopQuest for a human to review (approve or flag). Returns the task id and status; the verdict arrives later via webhook or get_task_status.",
  {
    content: z.string().describe("The content a human should review."),
    title: z.string().optional().describe("Short title shown on the review card."),
    module: z.enum(["swiper", "detective", "decoy", "arena"]).optional().describe("Which review game (default swiper)."),
    source: z.string().optional().describe("Originating agent/workflow id."),
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
