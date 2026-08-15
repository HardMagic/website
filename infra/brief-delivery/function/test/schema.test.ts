import assert from "node:assert/strict";
import test from "node:test";
import { intakeCategories } from "../src/catalog.js";
import { briefRequestSchema, contactRequestSchema, isCorporateEmail } from "../src/schema.js";

const baseBrief = {
  report: "generative-media-operating-system",
  name: "Ada Lovelace",
  email: "ADA@EXAMPLE.COM",
  organization: "Analytical Engines",
  role: "Creative Director",
  industry: "Media",
  organization_size: "250-999",
  decision_stage: "Evaluating",
  decision_horizon: "This quarter",
  primary_challenge: "Build a governed generative media operation",
  preferred_next_step: "Working session",
  intake_category: "genai",
  consent: "yes",
  marketing_consent: "no",
};

test("all six HardMagic intake categories are accepted", () => {
  for (const intake_category of intakeCategories) assert.equal(briefRequestSchema.safeParse({ ...baseBrief, intake_category }).success, true);
});

test("email normalization and separate marketing consent are enforced", () => {
  const result = briefRequestSchema.parse(baseBrief);
  assert.equal(result.email, "ada@example.com");
  assert.equal(result.marketing_consent, "no");
});

test("corporate email policy rejects consumer mailboxes but allows custom company domains", () => {
  for (const email of ["reader@gmail.com", "reader@googlemail.com", "reader@hotmail.com", "reader@hotmail.co.uk", "reader@outlook.com", "reader@yahoo.com", "reader@yahoo.co.uk"]) {
    assert.equal(isCorporateEmail(email), false, email);
    assert.equal(briefRequestSchema.safeParse({ ...baseBrief, email }).success, false, email);
  }
  assert.equal(isCorporateEmail("reader@company.com"), true);
  assert.equal(briefRequestSchema.safeParse({ ...baseBrief, email: "reader@company.com" }).success, true);
  assert.equal(briefRequestSchema.safeParse({ ...baseBrief, email: "reader@company.onmicrosoft.com" }).success, true);
});

test("unknown service lanes and unknown fields fail closed", () => {
  assert.equal(briefRequestSchema.safeParse({ ...baseBrief, intake_category: "everything" }).success, false);
  assert.equal(briefRequestSchema.safeParse({ ...baseBrief, secret_notes: "do not collect" }).success, false);
});

test("consultation intake requires a substantive mandate", () => {
  const result = contactRequestSchema.safeParse({
    name: "Grace Hopper",
    email: "grace@example.com",
    organization: "Example",
    role: "VP Media",
    intake_category: "media-management",
    mandate: "Unify the media estate, rights data, and publishing controls.",
    decision_horizon: "90 days",
    preferred_next_step: "Architecture review",
    consent: "yes",
  });
  assert.equal(result.success, true);
});
