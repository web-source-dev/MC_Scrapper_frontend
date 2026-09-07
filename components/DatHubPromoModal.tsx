"use client";

import { DAT_HUB_PHONE_DISPLAY, datHubWhatsAppUrl } from "@/lib/datHub";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DatHubPromoModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="dathub-promo-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dathub-promo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dathub-promo-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="dathub-promo-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="dathub-promo-kicker">Partner offer</p>
        <h2 id="dathub-promo-title">Need DAT Loadboard access?</h2>
        <p className="dathub-promo-copy">
          While your MC search runs, message us on WhatsApp for DAT Loadboard access.
        </p>
        <a
          className="dathub-promo-banner"
          href={datHubWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Message us on WhatsApp at ${DAT_HUB_PHONE_DISPLAY}`}
        >
          <img
            src="/Dat_hub_ad.png"
            alt={`Get access to DAT Loadboard. WhatsApp ${DAT_HUB_PHONE_DISPLAY}`}
            width={560}
            height={900}
            decoding="async"
          />
        </a>
        <div className="dathub-promo-actions">
          <a className="dathub-promo-cta" href={datHubWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
            WhatsApp us
          </a>
          <button type="button" className="dathub-promo-dismiss" onClick={onClose}>
            Continue searching
          </button>
        </div>
      </div>
    </div>
  );
}
