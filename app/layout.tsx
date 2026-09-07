import { AuthProvider } from "@/components/AuthProvider";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans, Syne } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const display = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "MC Finder",
  title: {
    default: "MC Finder",
    template: "%s · MC Finder",
  },
  description:
    "Find SAFER-active, MC-authorized USA carriers by MC range, USDOT, company name, location, or phone.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=5", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/favicon-16x16.png?v=5", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=5", sizes: "32x32", type: "image/png" },
      { url: "/icon.png?v=5", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=5", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico?v=5"],
  },
  openGraph: {
    title: "MC Finder",
    description: "Find SAFER-active, MC-authorized USA carriers.",
    siteName: "MC Finder",
    images: [{ url: "/mc_finder_icon.png?v=5", width: 512, height: 512, alt: "MC Finder" }],
  },
  twitter: {
    card: "summary",
    title: "MC Finder",
    description: "Find SAFER-active, MC-authorized USA carriers.",
    images: ["/mc_finder_icon.png?v=5"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f243c" },
    { media: "(prefers-color-scheme: dark)", color: "#0f243c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable} h-full`}>
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
