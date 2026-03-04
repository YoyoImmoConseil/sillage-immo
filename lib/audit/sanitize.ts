const maskEmail = (value: string) => {
  const [local, domain] = value.split("@");
  if (!domain) return "***";
  const visible = local ? local[0] : "";
  return `${visible}***@${domain}`;
};

const maskPhone = (value: string) => {
  const digits = value.replace(/\s+/g, "");
  if (digits.length <= 2) return "***";
  return `${"*".repeat(Math.max(0, digits.length - 2))}${digits.slice(-2)}`;
};

const sanitizeString = (key: string, value: string) => {
  const normalized = key.toLowerCase();
  if (normalized.includes("email")) return maskEmail(value);
  if (normalized.includes("phone")) return maskPhone(value);
  if (normalized.includes("message")) return `[len:${value.length}]`;
  if (normalized.includes("name")) return value ? `${value[0]}***` : "***";
  return value;
};

const sanitizeValue = (key: string, value: unknown, depth: number): unknown => {
  if (depth <= 0) return "[truncated]";
  if (typeof value === "string") return sanitizeString(key, value);
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(key, item, depth - 1));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return Object.fromEntries(
      entries.slice(0, 50).map(([k, v]) => [k, sanitizeValue(k, v, depth - 1)])
    );
  }
  return value;
};

export const sanitizeAuditInput = (input: unknown) => {
  return sanitizeValue("input", input, 2);
};
