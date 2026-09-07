/** Support WhatsApp — digits only, country code included (no +). */
export const DAT_HUB_WHATSAPP = "923133808594";
export const DAT_HUB_PHONE_DISPLAY = "+92 313 3808594";

/** Opens the WhatsApp chat with no prefilled message. */
export function datHubWhatsAppUrl() {
  return `https://wa.me/${DAT_HUB_WHATSAPP}`;
}

/** WhatsApp contact for manual plan changes. */
export function planChangeWhatsAppUrl() {
  return datHubWhatsAppUrl();
}
