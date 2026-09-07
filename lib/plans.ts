export type PlanInfo = {
  id: string;
  name: string;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  blurb: string;
  highlights: string[];
  featured?: boolean;
};

/** Marketing copy keyed to backend plan ids. Limits come from the API when available. */
export const PLAN_CATALOG: PlanInfo[] = [
  {
    id: "free",
    name: "Free",
    dailyLimit: 1000,
    monthlyLimit: 30000,
    blurb: "Start searching SAFER-active carriers with daily and monthly caps.",
    highlights: [
      "1,000 MCs / day",
      "30,000 MCs / month",
      "MC, USDOT & company search",
      "Export CSV",
      "No card required",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    dailyLimit: 5000,
    monthlyLimit: 150000,
    blurb: "For solo dispatchers who need a solid daily desk with room across the month.",
    highlights: [
      "5,000 MCs / day",
      "150,000 MCs / month",
      "All Free features",
      "Fleet & safety filters",
      "Phone & email filters",
    ],
    featured: true,
  },
  {
    id: "plus",
    name: "Plus",
    dailyLimit: 10000,
    monthlyLimit: 300000,
    blurb: "Higher volume for busy freight desks that search every day.",
    highlights: [
      "10,000 MCs / day",
      "300,000 MCs / month",
      "All Standard features",
      "Faster multi-mode search",
      "Priority support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    dailyLimit: 20000,
    monthlyLimit: 600000,
    blurb: "High-capacity searching for teams that live in the desk.",
    highlights: [
      "20,000 MCs / day",
      "600,000 MCs / month",
      "All Plus features",
      "Best for multi-seat desks",
      "Admin-ready accounts",
    ],
  },
  {
    id: "custom",
    name: "Custom",
    dailyLimit: null,
    monthlyLimit: null,
    blurb: "Tailored daily and monthly limits for fleets and brokerages.",
    highlights: ["Custom day + month limits", "Volume pricing", "Dedicated onboarding", "Talk to us to set limits"],
  },
];

export function formatPlanLimit(daily: number | null | undefined, monthly?: number | null | undefined) {
  if (daily == null && monthly == null) return "Custom limits";
  if (daily == null) return monthly != null ? `${monthly.toLocaleString()} / month` : "Custom";
  if (monthly == null) return `${daily.toLocaleString()} / day`;
  return `${daily.toLocaleString()} / day · ${monthly.toLocaleString()} / month`;
}

/** Plan card heading — monthly volume only. */
export function formatPlanMonthly(monthly: number | null | undefined) {
  if (monthly == null) return "Custom / month";
  return `${monthly.toLocaleString()} / month`;
}

export function mergePlanCatalog(
  apiPlans?: Array<{ id: string; name: string; dailyLimit: number | null; monthlyLimit?: number | null }>,
): PlanInfo[] {
  if (!apiPlans?.length) return PLAN_CATALOG;
  return PLAN_CATALOG.map((item) => {
    const match = apiPlans.find((plan) => plan.id === item.id);
    if (!match) return item;
    return {
      ...item,
      name: match.name || item.name,
      dailyLimit: match.dailyLimit,
      monthlyLimit: match.monthlyLimit ?? item.monthlyLimit,
    };
  });
}
