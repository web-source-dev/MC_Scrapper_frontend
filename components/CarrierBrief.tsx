"use client";

import { useState, type MouseEvent } from "react";
import { decideDispatch } from "@/lib/dispatchDecision";
import { MAIL_UI_ENABLED, openCarrierEmail } from "@/lib/email";
import type { Carrier, QcSnapshot } from "@/lib/types";

type Props = {
  carrier: Carrier;
  snapshot: QcSnapshot | null;
  snapshotLoading?: boolean;
};

function newSeed() {
  return Math.floor(Math.random() * 1_000_000_000) + Date.now();
}

export function CarrierBrief({ carrier, snapshot, snapshotLoading }: Props) {
  const [seed] = useState(newSeed);
  const decision = decideDispatch(carrier, snapshot, snapshotLoading, seed);
  const tel = decision.phone ? `tel:${decision.phone.replace(/\D/g, "")}` : null;
  const stamp = decision.verdict === "pass" ? "Pass" : decision.verdict === "caution" ? "Caution" : "Cover";
  const [lead, ...rest] = decision.say;

  function openEmail(event: MouseEvent) {
    event.stopPropagation();
    openCarrierEmail(carrier);
  }

  const actions = (
    <div className="dispatch-actions">
      {tel ? (
        <a
          className={
            decision.livePending || decision.verdict === "pass" ? "ghost dispatch-call" : "primary dispatch-call"
          }
          href={tel}
          onClick={(event) => event.stopPropagation()}
        >
          {decision.verdict === "pass" ? `Call anyway ${decision.phone}` : `Call ${decision.phone}`}
        </a>
      ) : null}
      {MAIL_UI_ENABLED ? (
        <button type="button" className="ghost dispatch-call" onClick={openEmail}>
          {carrier.email ? "Email" : "Email…"}
        </button>
      ) : null}
    </div>
  );

  if (decision.livePending) {
    return (
      <section className="dispatch-card is-checking" aria-busy="true" aria-live="polite">
        <p className="sr-only">Checking live status before a cover decision.</p>
        <div className="dispatch-head">
          <span className="skeleton dispatch-skel-stamp" />
          <span className="skeleton dispatch-skel-lead" />
          {actions}
        </div>
        <span className="skeleton dispatch-skel-line" />
        <span className="skeleton dispatch-skel-line is-short" />
      </section>
    );
  }

  return (
    <section className={`dispatch-card is-${decision.verdict}`}>
      <div className="dispatch-head">
        <p className="dispatch-stamp">{stamp}</p>
        <p className="dispatch-lead">{lead}</p>
        {actions}
      </div>
      {rest.length ? <p className="dispatch-more">{rest.join(" ")}</p> : null}
      <p className="dispatch-do">{decision.doNext}</p>
      {decision.script ? <p className="dispatch-script">Say: “{decision.script}”</p> : null}
    </section>
  );
}
