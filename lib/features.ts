export const FEATURES = [
  {
    id: "search_identity",
    label: "MC, USDOT & company search",
    blurb: "MC range, single MC/DOT, pasted lists, and company name.",
  },
  {
    id: "export_csv",
    label: "Export CSV",
    blurb: "Download matched carriers.",
  },
  {
    id: "filters_fleet_safety",
    label: "Fleet & safety filters",
    blurb: "Fleet size, safety rating, and MCS-150 recency.",
  },
  {
    id: "filters_contacts",
    label: "Phone & email filters",
    blurb: "Require phone, cell, email, or any contact.",
  },
  {
    id: "search_multimode",
    label: "Multi-mode search",
    blurb: "Location and phone search in addition to MC, USDOT, and company.",
  },
  {
    id: "filters_advanced",
    label: "Advanced filters",
    blurb: "Equipment, hazmat, interstate, and truck/driver bounds.",
  },
  {
    id: "priority_support",
    label: "Priority support",
    blurb: "Faster help when you message the desk.",
  },
] as const;

export type FeatureId = (typeof FEATURES)[number]["id"];

export const FEATURE_IDS = FEATURES.map((item) => item.id);

export const IDENTITY_MODES = ["mc-range", "mc-lookup", "id-list", "company-name"] as const;
export const MULTIMODE_MODES = ["location", "phone"] as const;

export const PLAN_FEATURES: Record<string, FeatureId[]> = {
  free: ["search_identity", "export_csv"],
  standard: ["search_identity", "export_csv", "filters_fleet_safety", "filters_contacts"],
  plus: [
    "search_identity",
    "export_csv",
    "filters_fleet_safety",
    "filters_contacts",
    "search_multimode",
    "filters_advanced",
    "priority_support",
  ],
  premium: [...FEATURE_IDS],
};

export function featuresForPlan(planId?: string | null): FeatureId[] {
  if (planId === "custom") return [...FEATURE_IDS];
  return [...(PLAN_FEATURES[planId || "free"] || PLAN_FEATURES.free)];
}

export function hasFeature(features: string[] | undefined | null, id: FeatureId) {
  return Array.isArray(features) && features.includes(id);
}

export function featuresForUser(user?: { plan?: string; features?: string[] } | null): FeatureId[] {
  if (Array.isArray(user?.features)) {
    return FEATURE_IDS.filter((id) => user.features?.includes(id));
  }
  return featuresForPlan(user?.plan || "free");
}

export function allowedSearchModes(features: string[] | undefined | null) {
  const modes: Array<(typeof IDENTITY_MODES)[number] | (typeof MULTIMODE_MODES)[number]> = [];
  if (hasFeature(features, "search_identity")) modes.push(...IDENTITY_MODES);
  if (hasFeature(features, "search_multimode")) modes.push(...MULTIMODE_MODES);
  return modes;
}

export function planUnlocksFeature(planId: string, featureId: FeatureId) {
  if (planId === "custom") return true;
  return featuresForPlan(planId).includes(featureId);
}

export function sanitizeSearchForm<T extends {
  searchMode: string;
  fleetPreset: string;
  safetyRating: string;
  mcs150Months: string;
  equipmentTypes: string[];
  minTrucks: string;
  maxTrucks: string;
  minDrivers: string;
  maxDrivers: string;
  city: string;
  zip: string;
  hazmatOnly: boolean;
  requirePhone: boolean;
  requireCell: boolean;
  requireEmail: boolean;
  requireContact: boolean;
  interstateOnly: boolean;
  intrastateOnly: boolean;
  freightOnly: boolean;
}>(form: T, features: string[]): T {
  const next = { ...form };
  const modes = allowedSearchModes(features);
  if (modes.length && !modes.includes(next.searchMode as (typeof modes)[number])) {
    next.searchMode = modes[0];
  }
  if (!hasFeature(features, "filters_fleet_safety")) {
    next.fleetPreset = "any";
    next.safetyRating = "any";
    next.mcs150Months = "any";
  }
  if (!hasFeature(features, "filters_contacts")) {
    next.requirePhone = false;
    next.requireCell = false;
    next.requireEmail = false;
    next.requireContact = false;
  }
  if (!hasFeature(features, "filters_advanced")) {
    next.equipmentTypes = [];
    next.hazmatOnly = false;
    next.interstateOnly = false;
    next.intrastateOnly = false;
    next.freightOnly = false;
    next.minDrivers = "";
    next.maxDrivers = "";
    if (next.searchMode !== "location") {
      next.city = "";
      next.zip = "";
    }
    if (next.fleetPreset === "any") {
      next.minTrucks = "1";
      next.maxTrucks = "";
    }
  }
  return next;
}
