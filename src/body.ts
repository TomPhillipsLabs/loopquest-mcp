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
