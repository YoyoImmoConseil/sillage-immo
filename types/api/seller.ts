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

export type SellerPortalAccessData = {
  mode: "invite" | "login";
  email: string;
  nextPath: string;
  inviteToken: string | null;
};

export type SellerUploadedPropertyMedia = {
  uploadId: string;
  kind: "image" | "video";
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageBucket: string;
  storagePath: string;
  previewUrl: string;
};

export type SellerPropertyMediaUploadSuccessResponse = {
  ok: true;
  data: {
    files: SellerUploadedPropertyMedia[];
  };
};

export type SellerPropertyMediaSignedUploadDescriptor = {
  uploadId: string;
  fileName: string;
  contentType: string;
  storageBucket: string;
  storagePath: string;
  uploadUrl: string;
};

export type SellerPropertyMediaSignedUploadSuccessResponse = {
  ok: true;
  data: {
    files: SellerPropertyMediaSignedUploadDescriptor[];
  };
};

export type SellerPropertyMediaSignedUploadResponse =
  | SellerPropertyMediaSignedUploadSuccessResponse
  | SellerApiErrorResponse;

export type SellerEstimateAndCreateSuccessResponse = {
  ok: true;
  data: {
    createStatus: "created" | "reused";
    thankYouAccessToken: string;
    valuation: SellerEstimateValuationData;
    portalAccess: SellerPortalAccessData | null;
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
export type SellerPropertyMediaUploadResponse =
  | SellerPropertyMediaUploadSuccessResponse
  | SellerApiErrorResponse;
export type SellerEstimateAndCreateResponse =
  | SellerEstimateAndCreateSuccessResponse
  | SellerEstimateAndCreateDuplicateResponse
  | SellerApiErrorResponse;
export type SellerLeadCreateResponse =
  | SellerLeadCreateSuccessResponse
  | SellerLeadCreateDuplicateResponse
  | SellerApiErrorResponse;
