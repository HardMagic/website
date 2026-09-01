import { z } from "zod";

const uuid = z.string().uuid();
const url = z.string().url();
const canonicalGuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Dataverse identifiers are inserted into OData paths and binds. Keep the
 * secret-backed values to the canonical, lower-case GUID representation so a
 * malformed secret can never become part of an OData expression. Dataverse
 * accepts GUIDs case-insensitively, so existing upper-case Key Vault values
 * are normalized rather than rejected.
 */
export function isCanonicalGuid(value: unknown): value is string {
  return typeof value === "string" && canonicalGuidPattern.test(value);
}

export function requireCanonicalGuid(value: unknown, field: string): string {
  if (!isCanonicalGuid(value)) throw new Error(`dataverse_${field}_guid_invalid`);
  return value.toLowerCase();
}

const environmentSchema = z.object({
  AZURE_CLIENT_ID: uuid,
  BRIEF_STORAGE_ACCOUNT_NAME: z.string().regex(/^[a-z0-9]{3,24}$/),
  BRIEF_CONTAINER_NAME: z.string().default("briefs"),
  LEDGER_CONTAINER_NAME: z.string().default("ledger"),
  DEADLETTER_CONTAINER_NAME: z.string().default("deadletter"),
  CRM_RETRY_QUEUE_NAME: z.string().default("crm-retry"),
  COMPANY_NAME: z.string().default("HardMagic Corporation"),
  COMPANY_DOMAIN: z.literal("hardmagic.com"),
  BRIEF_HOST: z.literal("briefs.hardmagic.com"),
  PUBLIC_SITE_URL: url,
  CONTACT_URL: url,
  CONTACT_EMAIL: z.string().email(),
  REPLY_TO: z.string().email(),
  ALLOWED_ORIGINS: z.string().transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
  EXPECTED_FRONT_DOOR_ID: uuid,
  KEY_VAULT_URI: url,
  ACS_ENDPOINT: url,
  ACS_SENDER_ADDRESS_SECRET_NAME: z.string().min(1),
  TURNSTILE_SECRET_NAME: z.string().min(1),
  UNSUBSCRIBE_TOKEN_SECRET_NAME: z.string().min(1),
  DATAVERSE_ACCOUNT_ID_SECRET_NAME: z.string().min(1),
  DATAVERSE_BUSINESS_UNIT_ID_SECRET_NAME: z.string().min(1),
  DATAVERSE_OWNER_TEAM_ID_SECRET_NAME: z.string().min(1),
  DATAVERSE_URL: url,
  DATAVERSE_ENTITY_SET: z.literal("hm_briefengagements"),
  DATAVERSE_ENTITY_LOGICAL_NAME: z.literal("hm_briefengagement"),
  DATAVERSE_REQUEST_ID_COLUMN: z.literal("hm_requestid"),
  TURNSTILE_REQUIRED: z.enum(["true", "false"]).transform((value) => value === "true"),
  SAS_HOURS: z.coerce.number().int().min(48).max(48).default(48),
  RATE_LIMIT_PER_HOUR: z.coerce.number().int().min(1).max(50).default(5),
});

export type RuntimeConfig = z.infer<typeof environmentSchema>;

let cached: RuntimeConfig | undefined;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  if (environment === process.env && cached) return cached;
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).filter(Boolean).join(", ");
    throw new Error(`configuration_invalid:${fields}`);
  }
  if (parsed.data.PUBLIC_SITE_URL !== "https://hardmagic.com") throw new Error("configuration_invalid:PUBLIC_SITE_URL");
  if (!parsed.data.ALLOWED_ORIGINS.includes(parsed.data.PUBLIC_SITE_URL)) throw new Error("configuration_invalid:ALLOWED_ORIGINS");
  if (environment === process.env) cached = parsed.data;
  return parsed.data;
}

export function resetConfigForTests(): void {
  cached = undefined;
}
