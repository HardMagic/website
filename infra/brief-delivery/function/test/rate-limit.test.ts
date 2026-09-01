import assert from "node:assert/strict";
import test from "node:test";
import { advanceRateLimitCounter, pruneRateLimitTimestamps, rateLimitCounterPath, rateLimitLeaseRetryDelay } from "../src/platform.js";

const HOUR_MS = 60 * 60 * 1_000;

test("rolling counter prunes stale, future, and malformed timestamps", () => {
  const now = 10 * HOUR_MS;
  const timestamps = [
    now - HOUR_MS + 1,
    now - HOUR_MS,
    now + 1,
    now + 5 * 60 * 1_000 + 1,
    Number.NaN,
    "not-a-timestamp",
  ];

  assert.deepEqual(pruneRateLimitTimestamps(timestamps, now), [now - HOUR_MS + 1, now + 1]);
  assert.deepEqual(timestamps, [now - HOUR_MS + 1, now - HOUR_MS, now + 1, now + 5 * 60 * 1_000 + 1, Number.NaN, "not-a-timestamp"]);
});

test("missing counters start empty and the configured limit is atomic at the decision boundary", () => {
  const now = 10 * HOUR_MS;
  const first = advanceRateLimitCounter(undefined, now, 2);
  assert.equal(first.allowed, true);
  assert.deepEqual(first.counter.timestamps, [now]);

  const second = advanceRateLimitCounter({ timestamps: [now] }, now + 1, 2);
  assert.equal(second.allowed, true);
  assert.deepEqual(second.counter.timestamps, [now, now + 1]);

  const denied = advanceRateLimitCounter({ timestamps: [now, now + 1] }, now + 2, 2);
  assert.equal(denied.allowed, false);
  assert.deepEqual(denied.counter.timestamps, [now, now + 1]);

  const bounded = advanceRateLimitCounter({ timestamps: [now - 2, now - 1, now] }, now + 2, 2);
  assert.equal(bounded.allowed, false);
  assert.deepEqual(bounded.counter.timestamps, [now - 1, now]);

  const afterWindow = advanceRateLimitCounter({ timestamps: [now] }, now + HOUR_MS, 2);
  assert.equal(afterWindow.allowed, true);
  assert.deepEqual(afterWindow.counter.timestamps, [now + HOUR_MS]);
});

test("malformed counter state and un-hashed scopes fail closed", () => {
  assert.throws(() => advanceRateLimitCounter({ timestamps: "not-an-array" }, 10 * HOUR_MS, 5), /rate_limit_state_invalid/);
  assert.throws(() => rateLimitCounterPath("reader@example.com"), /rate_limit_scope_invalid/);

  const path = rateLimitCounterPath("a".repeat(64));
  assert.equal(path, `rate/${"a".repeat(64)}.json`);
  assert.doesNotMatch(path, /@|reader|example/i);
});

test("lease retries use bounded exponential backoff with jitter", () => {
  assert.equal(rateLimitLeaseRetryDelay(0, 0), 50);
  assert.equal(rateLimitLeaseRetryDelay(0, 0.99), 99);
  assert.equal(rateLimitLeaseRetryDelay(1, 0), 100);
  assert.equal(rateLimitLeaseRetryDelay(2, 0.5), 225);
  assert.equal(rateLimitLeaseRetryDelay(20, 0.99), 299);
  assert.ok(rateLimitLeaseRetryDelay(1, 0.75) > rateLimitLeaseRetryDelay(1, 0.25));
  assert.throws(() => rateLimitLeaseRetryDelay(-1, 0), /rate_limit_retry_attempt_invalid/);
  assert.throws(() => rateLimitLeaseRetryDelay(0, 1), /rate_limit_retry_jitter_invalid/);
});
