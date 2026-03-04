import "server-only";
import { createHash } from "crypto";

export const hashValue = (value: string) => {
  return createHash("sha256").update(value).digest("hex");
};
