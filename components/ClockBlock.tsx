"use client";

import { prettyDate } from "@/lib/clock";

export function ClockBlock({
  message,
  serverDate,
  deviceDate,
}: {
  message: string;
  serverDate: string;
  deviceDate: string;
}) {
  return (
    <div className="clock-block" role="alert">
      <p className="usage-kicker">Date mismatch</p>
      <h2>You can’t use this tool</h2>
      <p>{message}</p>
      <dl>
        <div>
          <dt>Real date</dt>
          <dd>{prettyDate(serverDate)}</dd>
        </div>
        <div>
          <dt>This computer</dt>
          <dd>{prettyDate(deviceDate)}</dd>
        </div>
      </dl>
      <p className="hint">Set the correct day and date in Windows Date & time, then refresh this page.</p>
    </div>
  );
}
