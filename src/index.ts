#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const BASE_URL = (process.env.LOOPQUEST_BASE_URL || "https://loopquest.tomphillips.uk").replace(/\/+$/, "");
const API_KEY = process.env.LOOPQUEST_API_KEY ?? "";

export interface CreateTaskArgs {
  content: string;
  title?: string;
  module?: "swiper" | "detective" | "decoy" | "arena";
  source?: string;
  external_id?: string;
  callback_url?: string;
  reviews_required?: number;
}

/** Build the POST /api/v1/tasks body from tool args. Pure — unit tested. */
export function buildTaskBody(args: CreateTaskArgs): Record<string, unknown> {
  const body: Record<string, unknown> = {
    module: args.module ?? "swiper",
    payload: { content: args.content },
    card: { title: args.title || "Review", body: args.content },
  };
  if (args.source) body.source = args.source;
  if (args.external_id) body.external_id = args.external_id;
  if (args.callback_url) body.callback_url = args.callback_url;
  if (args.reviews_required) body.reviews_required = args.reviews_required;
  return body;
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${API_KEY}`, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

const server = new McpServer({ name: "loopquest", version: "0.1.0" });

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

// Only start the stdio server when run directly (not when imported by tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("loopquest-mcp failed:", err);
    process.exit(1);
  });
}
