export type SearchMode =
  | "mc-range"
  | "mc-lookup"
  | "id-list"
  | "company-name"
  | "location"
  | "phone";

export type IdentifierType = "mc" | "dot";

export type EquipmentOption = {
  id: string;
  label: string;
};

export type SearchModeOption = {
  id: SearchMode;
  label: string;
  description: string;
};

export type StateOption = {
  code: string;
  name: string;
};

export type SafetyOption = {
  id: string;
  label: string;
};

export type FleetPreset = {
  id: string;
  label: string;
  minTrucks: string;
  maxTrucks: string;
};

export type MetaResponse = {
  searchModes: SearchModeOption[];
  equipmentTypes: EquipmentOption[];
  safetyRatings: SafetyOption[];
  fleetPresets?: FleetPreset[];
  mcs150Options?: SafetyOption[];
  states: StateOption[];
  qcMobile?: boolean;
  qcProxy?: { enabled: boolean; host: string | null };
  openRouter?: boolean;
  openRouterModel?: string | null;
  reviewTags?: Array<{ id: string; label: string }>;
  reviewWords?: string[];
  limits: {
    maxMcRange: number;
    maxList: number;
    maxResults: number;
  };
};

export type CarrierAddress = {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  line?: string | null;
};

export type UnitCounts = {
  owned: number;
  termLeased: number;
  tripLeased: number;
  total: number;
};

export type Docket = {
  prefix: string | null;
  number: number | null;
  status: string | null;
  statusLabel: string | null;
  display: string | null;
};

export type QcSnapshot = {
  available: boolean;
  reason?: string | null;
  allowToOperate?: string | null;
  outOfService?: string | null;
  outOfServiceDate?: string | null;
  complaintCount?: number | string | null;
  authority?: Array<{ type: string | null; granted: string | null; status: string | null }>;
  basics?: Array<{
    name: string | null;
    percentile: string | number | null;
    onRoadDeficient: boolean;
    seriousDeficient: boolean;
    inspectionsWithViolation: number | null;
    violations: number | null;
  }>;
  cargo?: string[];
  operationClass?: string[];
  oos?: unknown;
};

export type Carrier = {
  id: string;
  mcNumber: number | null;
  mcDisplay: string | null;
  dotNumber: number | null;
  legalName: string | null;
  dbaName: string | null;
  phone: string | null;
  cellPhone: string | null;
  fax: string | null;
  email: string | null;
  officer: string | null;
  officer2: string | null;
  businessType: string | null;
  duns: string | null;
  addedDate: string | null;
  operationClass: string | null;
  carrierOperation: string | null;
  physicalAddress: CarrierAddress;
  mailingAddress: CarrierAddress;
  location: string | null;
  trucks: number;
  truckUnits: number;
  busUnits: number;
  drivers: number;
  fleet: {
    powerUnits: number;
    truckUnits: number;
    busUnits: number;
    trucks: UnitCounts;
    tractors: UnitCounts;
    trailers: UnitCounts;
  };
  driverCounts: {
    total: number;
    cdl: number;
    interstate: number;
    intrastate: number;
    leasedMonthly: number;
    interstateBeyond100: number;
    interstateWithin100: number;
    intrastateBeyond100: number;
    intrastateWithin100: number;
  };
  dockets: Docket[];
  equipment: string[];
  cargo: string[];
  hazmat: boolean;
  safetyRating: string;
  safetyRatingCode: string | null;
  safetyRatingDate: string | null;
  reviewType: string | null;
  reviewDate: string | null;
  crashRate: string | null;
  usdotStatus: string;
  authorityStatus: string;
  priorRevoke: boolean;
  priorRevokeDot: number | null;
  mcsipStep: string | null;
  mcsipDate: string | null;
  mcs150Date: string | null;
  mcs150Mileage: string | null;
  mcs150MileageYear: string | null;
  snapshot: QcSnapshot | null;
  saferUrl: string | null;
  liUrl: string | null;
  smsUrl: string | null;
};

export type ReviewKind = "review" | "report";
export type ReviewVerdict = "cover" | "mixed" | "pass";

export type DispatcherReview = {
  id: string;
  mcNumber: number | null;
  mcDisplay: string | null;
  dotNumber: number | null;
  legalName: string | null;
  kind?: ReviewKind;
  verdict?: ReviewVerdict | null;
  tags: string[];
  note: string;
  dispatcher: string | null;
  createdAt: string;
  published?: boolean;
};

export const REPORT_WORDS = [
  "No-show",
  "Unreachable",
  "Double broker",
  "Late",
  "Wrong equipment",
  "No tracking",
  "Failed to complete",
  "Unprofessional",
  "Detention",
  "Misrepresented",
] as const;

export type SearchFormState = {
  searchMode: SearchMode;
  startMc: string;
  endMc: string;
  identifierType: IdentifierType;
  identifier: string;
  idList: string;
  companyName: string;
  state: string;
  city: string;
  phone: string;
  equipmentTypes: string[];
  minTrucks: string;
  maxTrucks: string;
  minDrivers: string;
  maxDrivers: string;
  zip: string;
  fleetPreset: string;
  safetyRating: string;
  mcs150Months: string;
  hazmatOnly: boolean;
  requirePhone: boolean;
  requireCell: boolean;
  requireEmail: boolean;
  requireContact: boolean;
  interstateOnly: boolean;
  intrastateOnly: boolean;
  freightOnly: boolean;
  strictSafer: boolean;
  resultLimit: string;
};

export type UsageSnapshot = {
  plan: string;
  planName: string;
  dailyLimit: number;
  usedToday: number;
  remaining: number;
  date?: string;
  timezone?: string;
  serverNow?: number;
  serverDate?: string;
  history?: Array<{ date: string; used: number }>;
  totalUsed?: number;
  charged?: number;
};

export type VerifyResponse = {
  ok: boolean;
  error?: string;
  filters?: Record<string, unknown>;
  carriers?: Carrier[];
  usage?: UsageSnapshot;
  meta?: {
    source: string;
    dataset: string;
    domain: string;
    searchMode: SearchMode;
    scannedRange: { startMc: number; endMc: number } | null;
    returned: number;
    truncated: boolean;
    resultLimit: number;
    quotaCapped?: boolean;
    charged?: number;
    qcMobile?: boolean;
    summary: {
      withPhone: number;
      withEmail: number;
      hazmat: number;
      states: number;
      avgTrucks: number;
    };
  };
};

export const DEFAULT_FORM: SearchFormState = {
  searchMode: "mc-range",
  startMc: "100000",
  endMc: "100050",
  identifierType: "mc",
  identifier: "",
  idList: "",
  companyName: "",
  state: "",
  city: "",
  phone: "",
  equipmentTypes: [],
  minTrucks: "1",
  maxTrucks: "",
  minDrivers: "",
  maxDrivers: "",
  zip: "",
  fleetPreset: "any",
  safetyRating: "any",
  mcs150Months: "any",
  hazmatOnly: false,
  requirePhone: false,
  requireCell: false,
  requireEmail: false,
  requireContact: false,
  interstateOnly: false,
  intrastateOnly: false,
  freightOnly: false,
  strictSafer: true,
  resultLimit: "10000",
};

export type EmailAccount = {
  id: string;
  email: string;
  method: string;
  displayName: string;
  isDefault: boolean;
  connectedAt?: string;
  connected: boolean;
};

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
};

export type EmailVariable = {
  key: string;
  label: string;
  token: string;
};

export type EmailStatus = {
  ok: boolean;
  connected: boolean;
  account: EmailAccount | null;
  accounts: EmailAccount[];
  oauthAvailable: boolean;
  oauthMissing?: string[];
  redirectUri?: string;
  templates: EmailTemplate[];
  variables: EmailVariable[];
};

export type EmailDraft = {
  to: string;
  vars: Record<string, string>;
};
