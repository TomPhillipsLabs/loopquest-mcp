import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTaskBody } from "./body.ts";

test("defaults module to swiper and omits unset fields", () => {
  const body = buildTaskBody({ content: "hi" });
  assert.equal(body.module, "swiper");
  assert.deepEqual(body.payload, { content: "hi" });
  assert.deepEqual(body.card, { body: "hi" });
  assert.equal("external_id" in body, false);
  assert.equal("mode" in body, false);
});

test("passes correlation + gate fields", () => {
  const body = buildTaskBody({
    content: "the answer is 42",
    title: "Check this",
    external_id: "run-7",
    mode: "gate",
    timeout_seconds: 600,
    on_timeout: "reject",
    reviews_required: 2,
  });
  assert.equal(body.external_id, "run-7");
  assert.equal(body.mode, "gate");
  assert.equal(body.timeout_seconds, 600);
  assert.equal(body.on_timeout, "reject");
  assert.equal(body.reviews_required, 2);
});

test("grounding shapes claim + source", () => {
  const body = buildTaskBody({ module: "grounding", claim: "It renews after 24 months.", source_text: "Renews for 12-month terms." });
  assert.equal(body.module, "grounding");
  assert.deepEqual(body.payload, { claim: "It renews after 24 months.", source: "Renews for 12-month terms." });
  assert.equal("card" in body, false);
});

test("redact and detective put the text in payload.body", () => {
  assert.deepEqual(buildTaskBody({ module: "redact", content: "card 4242" }).payload, { body: "card 4242" });
  assert.deepEqual(buildTaskBody({ module: "detective", content: "long text" }).payload, { body: "long text" });
});

test("sorter puts buckets on card.choices", () => {
  const body = buildTaskBody({ module: "sorter", content: "charged twice", choices: ["Billing", "Spam"] });
  assert.deepEqual(body.card, { choices: ["Billing", "Spam"] });
});

test("advanced payload overrides per-module shaping", () => {
  const body = buildTaskBody({ module: "versus", payload: { prompt: "p", a: { text: "x" }, b: { text: "y" } } });
  assert.deepEqual(body.payload, { prompt: "p", a: { text: "x" }, b: { text: "y" } });
});
