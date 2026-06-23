import { z } from "zod";

// Zapier sends dates in many shapes (ISO, locale strings). Accept any
// parseable string and normalize to ISO; reject the unparseable.
export const isoDateString = z
  .string()
  .trim()
  .min(1)
  .transform((value, ctx) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date invalide." });
      return z.NEVER;
    }
    return date.toISOString();
  });

// Amounts often arrive as strings from Zapier field mapping; coerce to a
// finite number (the services round to integers as needed).
export const moneyAmount = z.coerce
  .number()
  .finite()
  .nonnegative();
