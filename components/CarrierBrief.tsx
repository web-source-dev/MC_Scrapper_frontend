"use client";

import { useState, type MouseEvent } from "react";
import { decideDispatch } from "@/lib/dispatchDecision";
import { openCarrierEmail } from "@/lib/email";
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

  return (
    <section className={`dispatch-card is-${decision.verdict}`}>
      <div className="dispatch-head">
        <p className="dispatch-stamp">{stamp}</p>
        <p className="dispatch-lead">{lead}</p>
        <div className="dispatch-actions">
          {tel ? (
            <a
              className={decision.verdict === "pass" ? "ghost dispatch-call" : "primary dispatch-call"}
              href={tel}
              onClick={(event) => event.stopPropagation()}
            >
              {decision.verdict === "pass" ? `Call anyway ${decision.phone}` : `Call ${decision.phone}`}
            </a>
          ) : null}
          <button type="button" className="ghost dispatch-call" onClick={openEmail}>
            {carrier.email ? "Email" : "Email…"}
          </button>
        </div>
      </div>
      {rest.length ? <p className="dispatch-more">{rest.join(" ")}</p> : null}
      <p className="dispatch-do">{decision.doNext}</p>
      {decision.script ? <p className="dispatch-script">Say: “{decision.script}”</p> : null}
    </section>
  );
}
