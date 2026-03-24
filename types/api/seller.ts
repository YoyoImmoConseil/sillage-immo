export type SellerApiErrorResponse = {
  ok: false;
  message: string;
  code?: string;
};

export type SellerSendOtpSuccessResponse = {
  ok: true;
  data: {
    sent: boolean;
    expiresAt: string;
    previewCode: string | null;
  };
};

export type SellerVerifyOtpSuccessResponse = {
  ok: true;
  data: {
    verificationToken: string;
    email: string;
  };
};

export type SellerEstimateValuationData = {
  valuationPriceLow: number | null;
  valuationPriceHigh: number | null;
  valuationPrice: number | null;
  addressLabel: string | null;
  cityName: string | null;
  cityZipCode: string | null;
  rooms: number | null;
  livingSpaceArea: number | null;
};

export type SellerEstimateAndCreateSuccessResponse = {
  ok: true;
  data: {
    createStatus: "created" | "reused";
    thankYouAccessToken: string;
    valuation: SellerEstimateValuationData;
  };
};

export type SellerEstimateAndCreateDuplicateResponse = {
  ok: false;
  code: "duplicate_blocked";
  message: string;
  data: {
    createStatus: "duplicate_blocked";
  };
};

export type SellerLeadCreateSuccessResponse = {
  ok: true;
  data: {
    createStatus: "created" | "reused";
    thankYouAccessToken: string;
    auditLogged: boolean;
    duplicateDetected: boolean;
  };
};

export type SellerLeadCreateDuplicateResponse = {
  ok: false;
  code: "duplicate_blocked";
  message: string;
  data: {
    createStatus: "duplicate_blocked";
    auditLogged: boolean;
    duplicateDetected: true;
  };
};

export type SellerSendOtpResponse = SellerSendOtpSuccessResponse | SellerApiErrorResponse;
export type SellerVerifyOtpResponse = SellerVerifyOtpSuccessResponse | SellerApiErrorResponse;
export type SellerEstimateAndCreateResponse =
  | SellerEstimateAndCreateSuccessResponse
  | SellerEstimateAndCreateDuplicateResponse
  | SellerApiErrorResponse;
export type SellerLeadCreateResponse =
  | SellerLeadCreateSuccessResponse
  | SellerLeadCreateDuplicateResponse
  | SellerApiErrorResponse;
