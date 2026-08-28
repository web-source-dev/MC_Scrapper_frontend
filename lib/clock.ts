export type ClockInfo = {
  serverNow?: number;
  serverDate?: string;
  timezone?: string;
};

export function dateInZone(timezone: string | undefined, at = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
}

export function prettyDate(isoDate: string | undefined) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function clockProblem(clock?: ClockInfo | null, at = Date.now()) {
  if (!clock?.serverDate) return null;
  const deviceDate = dateInZone(clock.timezone, at);
  if (deviceDate === clock.serverDate) return null;
  const past = deviceDate < clock.serverDate;
  return {
    past,
    deviceDate,
    serverDate: clock.serverDate,
    timezone: clock.timezone || "America/Chicago",
    message: past
      ? "Your computer date is in the past. You can't use this tool until you correct the day and date."
      : "Your computer date is wrong. You can't use this tool until you correct the day and date.",
  };
}
