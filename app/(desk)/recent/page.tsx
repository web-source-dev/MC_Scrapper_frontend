import { MailDeskPage } from "@/components/DeskShell";
import { MAIL_UI_ENABLED } from "@/lib/email";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recent",
};

export default function RecentRoute() {
  if (!MAIL_UI_ENABLED) redirect("/dashboard");
  return <MailDeskPage page="recent" />;
}
