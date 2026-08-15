import { z } from "zod";
import { briefs, intakeCategories } from "./catalog.js";

const cleanText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
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

const corporateEmail = z.string().trim().toLowerCase().email().max(320).refine(isCorporateEmail, { message: "corporate_email_required" });

export const briefRequestSchema = z.object({
  report: z.enum(Object.keys(briefs) as [keyof typeof briefs, ...(keyof typeof briefs)[]]),
  name: cleanText(160),
  email: corporateEmail,
  organization: cleanText(200),
  role: cleanText(120),
  industry: cleanText(120),
  organization_size: cleanText(80),
  decision_stage: cleanText(120),
  decision_horizon: cleanText(120),
  primary_challenge: cleanText(500),
  preferred_next_step: cleanText(160),
  intake_category: z.enum(intakeCategories),
  context: optionalText(2000),
  source_url: optionalText(500),
  source_campaign: optionalText(160),
  consent,
  marketing_consent: z.enum(["yes", "no"]).default("no"),
  _honey: z.string().max(0).optional().default(""),
  "cf-turnstile-response": optionalText(4096),
}).strict();

export const contactRequestSchema = z.object({
  name: cleanText(160),
  email: z.string().trim().toLowerCase().email().max(320),
  organization: cleanText(200),
  role: cleanText(120),
  intake_category: z.enum(intakeCategories),
  mandate: cleanText(4000),
  decision_horizon: cleanText(120),
  preferred_next_step: cleanText(160),
  source_url: optionalText(500),
  source_campaign: optionalText(160),
  consent,
  marketing_consent: z.enum(["yes", "no"]).default("no"),
  _honey: z.string().max(0).optional().default(""),
  "cf-turnstile-response": optionalText(4096),
}).strict();

export type BriefRequestInput = z.infer<typeof briefRequestSchema>;
export type ContactRequestInput = z.infer<typeof contactRequestSchema>;
