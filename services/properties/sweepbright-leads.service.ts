import "server-only";
import { sweepBrightClient } from "./sweepbright-client.service";

type SweepBrightLeadLocale = "fr" | "en" | "nl";

type BaseSweepBrightLeadInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  locale?: SweepBrightLeadLocale;
};

export type SweepBrightGeneralLeadInput = BaseSweepBrightLeadInput & {
  propertyId?: never;
  preferences?: Record<string, unknown>;
  locationPreference?: Record<string, unknown>;
  officeId?: string;
};

export type SweepBrightPropertyLeadInput = BaseSweepBrightLeadInput & {
  propertyId: string;
  officeId?: string;
};

export type SweepBrightOwnerLeadInput = BaseSweepBrightLeadInput & {
  id?: string;
  pronouns?: "male" | "female" | "neutral" | null;
  officeId?: string;
};

const isNonEmptyString = (value: string) => value.trim().length > 0;

const assertBaseLeadInput = (input: BaseSweepBrightLeadInput) => {
  if (
    !isNonEmptyString(input.firstName) ||
    !isNonEmptyString(input.lastName) ||
    !isNonEmptyString(input.email) ||
    !isNonEmptyString(input.phone) ||
    !isNonEmptyString(input.message)
  ) {
    throw new Error("Invalid SweepBright lead payload.");
  }
};

export const sendSweepBrightGeneralLead = async (input: SweepBrightGeneralLeadInput) => {
  assertBaseLeadInput(input);
  return sweepBrightClient.sendContactLead({
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    message: input.message.trim(),
    locale: input.locale ?? "fr",
    preferences: input.preferences ?? undefined,
    location_preference: input.locationPreference ?? undefined,
    office_id: input.officeId ?? undefined,
  });
};

export const sendSweepBrightPropertyLead = async (input: SweepBrightPropertyLeadInput) => {
  assertBaseLeadInput(input);
  if (!isNonEmptyString(input.propertyId)) {
    throw new Error("SweepBright propertyId is required.");
  }

  return sweepBrightClient.sendContactLead({
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    message: input.message.trim(),
    locale: input.locale ?? "fr",
    property_id: input.propertyId.trim(),
    office_id: input.officeId ?? undefined,
  });
};

export const sendSweepBrightOwnerLead = async (input: SweepBrightOwnerLeadInput) => {
  assertBaseLeadInput(input);
  return sweepBrightClient.sendOwnerLead({
    id: input.id ?? undefined,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    message: input.message.trim(),
    pronouns: input.pronouns ?? undefined,
    office_id: input.officeId ?? undefined,
  });
};
