import { z } from "zod";
import { briefs, intakeCategories } from "./catalog.js";

const hasNoControlCharacters = (value: string): boolean => !/[\p{Cc}]/u.test(value);
const cleanText = (max: number) => z.string().refine(hasNoControlCharacters, { message: "control_characters_not_allowed" }).trim().min(1).max(max);
const optionalText = (max: number) => z.string().refine(hasNoControlCharacters, { message: "control_characters_not_allowed" }).trim().max(max).optional().default("");
const uuidV4 = z.string().uuid({ version: "v4" });
const optionalUuid = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" && hasNoControlCharacters(value) ? undefined : value,
  uuidV4.optional(),
);
const campaign = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" && hasNoControlCharacters(value) ? undefined : value,
  z.string().refine(hasNoControlCharacters, { message: "control_characters_not_allowed" }).trim().max(160).regex(/^[a-z0-9][a-z0-9._-]*$/i).optional(),
).default("");
const consent = z.literal("yes");
const consumerEmailRoots = new Set(["gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "yahoo.com"]);
const consumerEmailVariants = new Set([
  "hotmail.co.uk", "hotmail.fr", "hotmail.de", "hotmail.it", "hotmail.es", "hotmail.com.au", "hotmail.co.jp", "hotmail.co.in", "hotmail.com.br", "hotmail.com.mx",
  "outlook.co.uk", "outlook.fr", "outlook.de", "outlook.it", "outlook.es", "outlook.com.au", "outlook.co.jp", "outlook.co.in", "outlook.com.br",
  "yahoo.co.uk", "yahoo.ca", "yahoo.com.au", "yahoo.co.in", "yahoo.fr", "yahoo.de", "yahoo.es", "yahoo.it", "yahoo.co.jp", "yahoo.com.br", "yahoo.com.mx", "yahoo.co.nz", "yahoo.com.sg", "yahoo.com.hk", "yahoo.com.ar", "yahoo.com.tr",
]);

function isConsumerEmailDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase().replace(/\.+$/, "");
  return consumerEmailRoots.has(normalized) || consumerEmailVariants.has(normalized) || [...consumerEmailRoots].some((root) => normalized.endsWith(`.${root}`));
}

export function isCorporateEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return false;
  return !isConsumerEmailDomain(email.slice(at + 1));
}

const corporateEmail = z.string().refine(hasNoControlCharacters, { message: "control_characters_not_allowed" }).trim().toLowerCase().email().max(320).refine(isCorporateEmail, { message: "corporate_email_required" });

export const briefRequestSchema = z.object({
  request_id: optionalUuid,
  report: z.enum(Object.keys(briefs) as [keyof typeof briefs, ...(keyof typeof briefs)[]]),
  name: cleanText(160),
  email: corporateEmail,
  organization: cleanText(200),
  role: cleanText(120),
  industry: cleanText(120),
  organization_size: z.enum([
    "1–49", "1-49",
    "50–249", "50-249",
    "250–999", "250-999",
    "1,000–9,999", "1,000-9,999",
    "10,000+",
  ]),
  decision_stage: z.enum(["Exploring", "Evaluating", "Piloting", "In production", "Scaling", "Transforming"]),
  decision_horizon: z.enum(["Now–30 days", "31–90 days", "3–6 months", "6–12 months", "Learning only", "This quarter"]),
  primary_challenge: cleanText(500),
  preferred_next_step: z.enum(["Send the brief only", "Brief plus a working session", "Discuss an advisory engagement", "Discuss a product", "Working session"]),
  intake_category: z.enum(intakeCategories),
  context: optionalText(2000),
  source_url: optionalText(500),
  source_campaign: campaign,
  consent,
  marketing_consent: z.enum(["yes", "no"]).default("no"),
  _honey: z.string().max(0).optional().default(""),
  "cf-turnstile-response": optionalText(4096),
}).strict();

export const contactRequestSchema = z.object({
  request_id: optionalUuid,
  name: cleanText(160),
  email: z.string().refine(hasNoControlCharacters, { message: "control_characters_not_allowed" }).trim().toLowerCase().email().max(320),
  organization: cleanText(200),
  role: cleanText(120),
  intake_category: z.enum(intakeCategories),
  mandate: cleanText(4000),
  decision_horizon: z.enum([
    "Now — next 30 days",
    "Now–30 days",
    "31–90 days",
    "3–6 months",
    "6–12 months",
    "Exploring — no date yet",
    "90 days",
  ]),
  preferred_next_step: z.enum([
    "A 30-minute exploratory conversation",
    "A working session with the right leads",
    "An engagement recommendation",
    "A product or systems discussion",
    "Written response",
    "Working session",
    "Advisory engagement",
    "Product discussion",
    "Architecture review",
  ]),
  source_url: optionalText(500),
  source_campaign: campaign,
  consent,
  marketing_consent: z.enum(["yes", "no"]).default("no"),
  _honey: z.string().max(0).optional().default(""),
  "cf-turnstile-response": optionalText(4096),
}).strict();

export type BriefRequestInput = z.infer<typeof briefRequestSchema>;
export type ContactRequestInput = z.infer<typeof contactRequestSchema>;
