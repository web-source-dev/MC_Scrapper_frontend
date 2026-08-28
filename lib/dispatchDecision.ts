import type { Carrier, QcSnapshot } from "./types";

export type Verdict = "cover" | "caution" | "pass";

type Flag =
  | "oos"
  | "not_allowed"
  | "usdot_inactive"
  | "mc_dead"
  | "unsatisfactory"
  | "pending"
  | "conditional"
  | "prior_revoke"
  | "basics"
  | "no_phone"
  | "no_trucks"
  | "small_fleet"
  | "stale_mcs"
  | "intrastate"
  | "live_unconfirmed"
  | "live_pending";

export type DispatchDecision = {
  verdict: Verdict;
  name: string;
  say: string[];
  doNext: string;
  script: string | null;
  phone: string | null;
  livePending: boolean;
};

function flagYn(value: unknown) {
  const text = String(value || "")
    .trim()
    .toUpperCase();
  if (["Y", "YES", "TRUE", "1"].includes(text)) return true;
  if (["N", "NO", "FALSE", "0"].includes(text)) return false;
  return null;
}

function monthsSince(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

function worse(a: Verdict, b: Verdict): Verdict {
  const rank = { cover: 0, caution: 1, pass: 2 };
  return rank[b] > rank[a] ? b : a;
}

function has(flags: Flag[], id: Flag) {
  return flags.includes(id);
}

function deskName(carrier: Carrier) {
  return carrier.dbaName || carrier.legalName || carrier.mcDisplay || "this MC";
}

function censusOperation(carrier: Carrier): string | null {
  const bits: string[] = [];
  if (carrier.carrierOperation) bits.push(carrier.carrierOperation);
  if (carrier.operationClass) bits.push(carrier.operationClass);

  const drivers = carrier.driverCounts;
  const radius: string[] = [];
  if (drivers?.interstateBeyond100) {
    radius.push(`${drivers.interstateBeyond100} interstate beyond 100 miles`);
  }
  if (drivers?.interstateWithin100) {
    radius.push(`${drivers.interstateWithin100} interstate within 100 miles`);
  }
  if (drivers?.intrastateBeyond100) {
    radius.push(`${drivers.intrastateBeyond100} intrastate beyond 100 miles`);
  }
  if (drivers?.intrastateWithin100) {
    radius.push(`${drivers.intrastateWithin100} intrastate within 100 miles`);
  }

  if (!bits.length && !radius.length) return null;
  if (bits.length && radius.length) {
    return `${bits.join(", ")}. MCS-150: ${radius.join(", ")}.`;
  }
  if (bits.length) return `${bits.join(", ")}.`;
  return `MCS-150: ${radius.join(", ")}.`;
}

function joinList(items: string[]) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function rngFrom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function talk(
  verdict: Verdict,
  flags: Flag[],
  carrier: Carrier,
  basics: string[],
  seed: number,
): { say: string[]; doNext: string; script: string | null } {
  const rng = rngFrom(seed);
  const name = deskName(carrier);
  const mc = carrier.mcDisplay || "the MC";
  const trucks = carrier.trucks;
  const phone = carrier.phone || carrier.cellPhone;
  const age = monthsSince(carrier.mcs150Date);
  const unit = trucks === 1 ? "truck" : "trucks";
  const howTheyRun = censusOperation(carrier);

  const script = phone
    ? pick(rng, [
        `Hey, calling on ${mc} — you empty? I've got a load.`,
        `Hi, ${name}? ${mc}. You got a truck empty?`,
        `Quick one — ${mc}. Are you covering freight right now?`,
        `Hey, it's dispatch. ${mc}. What trailer you running and when are you empty?`,
        `Calling on ${mc}. You available for a load?`,
      ])
    : null;

  if (verdict === "pass") {
    const why = [
      has(flags, "oos") ? pick(rng, ["they're out of service", "FMCSA has them OOS", "they're shut down"]) : null,
      has(flags, "not_allowed") ? pick(rng, ["they're not allowed to run", "live status says they can't operate"]) : null,
      has(flags, "usdot_inactive") ? pick(rng, ["the USDOT is inactive", "USDOT is dead"]) : null,
      has(flags, "mc_dead") ? pick(rng, ["the MC isn't active", "authority is dead", "no active MC"]) : null,
      has(flags, "unsatisfactory")
        ? pick(rng, ["the rating is Unsatisfactory", "Unsatisfactory safety — this will get kicked"])
        : null,
    ].filter(Boolean) as string[];
    const reason = why.length ? joinList(why) : "they can't legally take this load";
    return {
      say: [
        pick(rng, [
          `Don't cover ${name}. ${reason.replace(/^./, (c) => c.toUpperCase())}.`,
          `Pass on ${name}. ${reason.replace(/^./, (c) => c.toUpperCase())}.`,
          `I wouldn't touch ${name}. ${reason.replace(/^./, (c) => c.toUpperCase())}.`,
          `Skip ${name}. ${reason.replace(/^./, (c) => c.toUpperCase())}.`,
          `${name} is a no. ${reason.replace(/^./, (c) => c.toUpperCase())}.`,
        ]),
      ],
      doNext: pick(rng, [
        "Pull the next MC.",
        "Move on. Don't burn time here.",
        "Skip this one and keep working the list.",
        "Next carrier.",
      ]),
      script: null,
    };
  }

  if (has(flags, "live_pending")) {
    return {
      say: [
        pick(rng, [
          `Hold up — still checking if ${name} can run. Don't book yet.`,
          `Give it a second on ${name}. Live status is still coming in.`,
          `Don't punch this in yet. Waiting to see if ${name} is allowed to operate.`,
        ]),
      ],
      doNext: pick(rng, [
        "Wait for the live check, then look again.",
        "Let the live status land before you call.",
      ]),
      script: null,
    };
  }

  if (verdict === "caution") {
    const say: string[] = [];

    if (has(flags, "intrastate")) {
      say.push(
        pick(rng, [
          `Don't put ${name} on a crossing-state load. They're listed as intrastate.`,
          `${name} is listed as intrastate. Fine in-state, pass if this load crosses a line.`,
          `Keep ${name} off interstate freight. Census has them as intrastate.`,
        ]),
      );
    } else if (has(flags, "no_phone")) {
      say.push(
        pick(rng, [
          `I wouldn't book ${name} yet. No phone on file, so you can't dispatch them from here.`,
          `${name} looks maybe usable, but there's no number. You can't cover what you can't call.`,
          `Don't book ${name} until you have a working phone.`,
        ]),
      );
    } else if (has(flags, "no_trucks")) {
      say.push(
        pick(rng, [
          `${name} shows zero trucks. I'd treat them as parked or a broker until they say they have a unit.`,
          `No trucks on ${name}. Don't tender until they prove they've got a truck.`,
          `${name} might be empty on paper. Confirm they actually run before you cover.`,
        ]),
      );
    } else if (has(flags, "conditional")) {
      say.push(
        pick(rng, [
          `You can cover ${name}, but they're Conditional. If your broker takes that, call. If not, don't waste the dial.`,
          `${name} is coverable with a Conditional rating. Check the broker first, then call.`,
          `I'd only call ${name} if you already know the broker will take Conditional.`,
        ]),
      );
    } else if (has(flags, "pending")) {
      say.push(
        pick(rng, [
          `${name}'s authority is still pending. Don't tender until it's active.`,
          `Hold ${name}. MC is pending — you don't want this kicking after you book.`,
        ]),
      );
    } else {
      say.push(
        pick(rng, [
          `I'd be careful with ${name}.`,
          `${name} isn't a clean cover. Eyes open.`,
          `You can work ${name}, but it's not a slam dunk.`,
        ]),
      );
    }

    const extras: string[] = [];
    if (has(flags, "prior_revoke") && !has(flags, "intrastate")) {
      extras.push(
        pick(rng, [
          "they've had a revoke before — ask who they're running under now",
          "prior revoke on the file, so ask who the authority sits with",
        ]),
      );
    }
    if (has(flags, "basics")) {
      extras.push(
        pick(rng, [
          `BASICs are hot on ${joinList(basics)} — expect pushback`,
          `safety might get questioned (${joinList(basics)})`,
        ]),
      );
    }
    if (has(flags, "stale_mcs") && age != null) {
      extras.push(
        pick(rng, [
          `MCS-150 is ${Math.round(age)} months old, so confirm they still run`,
          `the file is stale — make sure ${name} is still operating`,
        ]),
      );
    }
    if (has(flags, "live_unconfirmed")) {
      extras.push(
        pick(rng, ["we didn't get a live FMCSA OK", "no live confirmation, just the census"]),
      );
    }
    if (howTheyRun) say.push(howTheyRun);
    if (extras.length) {
      say.push(
        pick(rng, [
          `Also, ${extras.join(", and ")}.`,
          `One more thing: ${extras.join(", and ")}.`,
          `Watch this too: ${extras.join(", and ")}.`,
        ]),
      );
    }

    return {
      say,
      doNext: has(flags, "no_phone")
        ? pick(rng, ["Find a number first, or move on.", "Get a phone or skip them."])
        : has(flags, "intrastate")
          ? pick(rng, ["Only use them if this load stays in-state.", "In-state only. Otherwise next MC."])
          : pick(rng, [
              "Call only if you can live with those issues.",
              "If that still works for the load, call. If not, skip.",
              "Your call — cover it knowing the risk, or keep looking.",
            ]),
      script: has(flags, "no_phone") || has(flags, "intrastate") ? null : script,
    };
  }

  const say = [
    pick(rng, [
      `I'd cover ${name}.`,
      `I'd take ${name} on this.`,
      `${name} looks good to cover.`,
      `You're fine covering ${name}.`,
      `I'd book ${name} if the rate works.`,
    ]),
  ];
  if (howTheyRun) say.push(howTheyRun);
  if (has(flags, "small_fleet")) {
    say.push(
      pick(rng, [
        `Only ${trucks} ${unit} on the file, so make sure they actually have a unit before you tender.`,
        `Small fleet — ${trucks} ${unit}. Confirm they're empty for your load, not already covered.`,
        `${trucks} ${unit} only. Ask if that truck is really available.`,
      ]),
    );
  } else {
    say.push(
      pick(rng, [
        "Nothing here that should get the load kicked.",
        "File looks clean. I wouldn't overthink it.",
        "No authority or OOS problem that I can see.",
        "This is a straightforward cover.",
      ]),
    );
  }

  return {
    say,
    doNext: phone
      ? pick(rng, [
          "Call, confirm empty time and trailer, then book it.",
          "Hit them, lock empty and equipment, then cover.",
          "Call now. If they're empty and the trailer matches, book it.",
          "Dial, get a yes on empty, and put it on.",
        ])
      : pick(rng, ["Get a number, then book it.", "Find a phone and cover it."]),
    script,
  };
}

export function decideDispatch(
  carrier: Carrier,
  snapshot: QcSnapshot | null,
  snapshotLoading = false,
  seed = Date.now(),
): DispatchDecision {
  const phone = carrier.phone || carrier.cellPhone || null;
  const flags: Flag[] = [];
  let verdict: Verdict = "cover";

  const usdot = String(carrier.usdotStatus || "").toLowerCase();
  const authority = String(carrier.authorityStatus || "").toLowerCase();
  const operation = String(carrier.carrierOperation || "").toLowerCase();
  const rating = String(carrier.safetyRating || "").toLowerCase();
  const live = Boolean(snapshot?.available);
  const oos = live ? flagYn(snapshot?.outOfService) : null;
  const allowed = live ? flagYn(snapshot?.allowToOperate) : null;
  const basics = (snapshot?.basics || [])
    .filter((item) => item.onRoadDeficient || item.seriousDeficient)
    .map((item) => item.name)
    .filter((name): name is string => Boolean(name));
  const age = monthsSince(carrier.mcs150Date);

  if (oos === true) {
    verdict = "pass";
    flags.push("oos");
  }
  if (allowed === false) {
    verdict = "pass";
    flags.push("not_allowed");
  }
  if (usdot.includes("inactive")) {
    verdict = "pass";
    flags.push("usdot_inactive");
  }
  if (authority.includes("no mc") || authority.includes("inactive") || authority.includes("revoked")) {
    verdict = "pass";
    flags.push("mc_dead");
  }
  if (rating === "unsatisfactory") {
    verdict = "pass";
    flags.push("unsatisfactory");
  }
  if (authority.includes("pending")) {
    verdict = worse(verdict, "caution");
    flags.push("pending");
  }
  if (rating === "conditional") {
    verdict = worse(verdict, "caution");
    flags.push("conditional");
  }
  if (carrier.priorRevoke) {
    verdict = worse(verdict, "caution");
    flags.push("prior_revoke");
  }
  if (basics.length) {
    verdict = worse(verdict, "caution");
    flags.push("basics");
  }
  if (!phone) {
    verdict = worse(verdict, "caution");
    flags.push("no_phone");
  }
  if (carrier.trucks <= 0) {
    verdict = worse(verdict, "caution");
    flags.push("no_trucks");
  } else if (carrier.trucks <= 2) {
    flags.push("small_fleet");
  }
  if (age != null && age > 24) {
    verdict = worse(verdict, "caution");
    flags.push("stale_mcs");
  }
  if (operation.includes("intrastate")) {
    verdict = worse(verdict, "caution");
    flags.push("intrastate");
  }
  if (!snapshotLoading && snapshot && !snapshot.available) {
    verdict = worse(verdict, "caution");
    flags.push("live_unconfirmed");
  }

  const livePending = Boolean(snapshotLoading) && verdict !== "pass";
  if (livePending) {
    verdict = "caution";
    flags.unshift("live_pending");
  }

  const spoken = talk(verdict, flags, carrier, basics, seed);

  return {
    verdict,
    name: deskName(carrier),
    ...spoken,
    phone,
    livePending,
  };
}
