export type GameModule =
  | "swiper"
  | "versus"
  | "sorter"
  | "detective"
  | "fixer"
  | "redact"
  | "grounding";

export interface CreateTaskArgs {
  content?: string;
  title?: string;
  module?: GameModule;
  claim?: string;
  source_text?: string;
  choices?: string[];
  mode?: "gate" | "monitor";
  timeout_seconds?: number;
  on_timeout?: "escalate" | "reject" | "approve";
  source?: string;
  external_id?: string;
  callback_url?: string;
  reviews_required?: number;
  /** Advanced: raw payload, overrides the per-module shaping (e.g. Versus / Fixer). */
  payload?: Record<string, unknown>;
}

/**
 * Build the POST /api/v1/tasks body from tool args, shaping the payload the way
 * each game expects: claim/source for grounding, body for redact/detective,
 * card.choices for sorter, content otherwise. Pure — unit tested.
 */
export function buildTaskBody(args: CreateTaskArgs): Record<string, unknown> {
  const module = args.module ?? "swiper";
  const content = args.content ?? "";

  let payload: Record<string, unknown>;
  if (args.payload) payload = args.payload;
  else if (module === "grounding") payload = { claim: args.claim || content, source: args.source_text ?? "" };
  else if (module === "redact" || module === "detective") payload = { body: content };
  else payload = { content };

  const body: Record<string, unknown> = { module, payload };

  // Card display hints. Sorter's buckets live here (card.choices).
  const card: Record<string, unknown> = {};
  if (args.title) card.title = args.title;
  if (content && module === "swiper") card.body = content;
  if (module === "sorter" && args.choices?.length) card.choices = args.choices;
  if (Object.keys(card).length) body.card = card;

  // Gating + routing.
  if (args.mode) body.mode = args.mode;
  if (args.timeout_seconds) body.timeout_seconds = args.timeout_seconds;
  if (args.on_timeout) body.on_timeout = args.on_timeout;
  if (args.source) body.source = args.source;
  if (args.external_id) body.external_id = args.external_id;
  if (args.callback_url) body.callback_url = args.callback_url;
  if (args.reviews_required) body.reviews_required = args.reviews_required;
  return body;
}
