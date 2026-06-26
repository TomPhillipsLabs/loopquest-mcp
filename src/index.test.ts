import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTaskBody } from "./body.ts";

test("buildTaskBody wraps content and passes correlation fields", () => {
  const body = buildTaskBody({
    content: "the answer is 42",
    title: "Check this",
    external_id: "run-7",
    module: "detective",
    reviews_required: 2,
  });
  assert.equal(body.module, "detective");
  assert.deepEqual(body.payload, { content: "the answer is 42" });
  assert.deepEqual(body.card, { title: "Check this", body: "the answer is 42" });
  assert.equal(body.external_id, "run-7");
  assert.equal(body.reviews_required, 2);
});

test("buildTaskBody defaults module and omits unset fields", () => {
  const body = buildTaskBody({ content: "hi" });
  assert.equal(body.module, "swiper");
  assert.equal("external_id" in body, false);
  assert.equal("callback_url" in body, false);
  assert.equal("source" in body, false);
});
