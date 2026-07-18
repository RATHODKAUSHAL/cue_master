import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "CueDesk CRM | Pool and Snooker Table Management",
  description:
    "A minimalist CRM dashboard for pool and snooker table owners to manage sessions, customers, pending amounts, analytics, and revenue.",
  manifest: "/manifest.json",
  applicationName: "CueDesk CRM",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icons/cuedesk-icon.svg", type: "image/svg+xml" },
      { url: "/icons/cuedesk-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/cue-master-logo-256.png", sizes: "256x256", type: "image/png" },
      { url: "/icons/cue-master-logo-384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/cuedesk-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "CueDesk CRM",
    title: "CueDesk CRM | Pool and Snooker Table Management",
    description:
      "Manage pool and snooker table sessions, customers, dues, analytics, and revenue from one installable dashboard.",
    images: [
      {
        url: "/pool-crm-dashboard.png",
        width: 1568,
        height: 1003,
        alt: "CueDesk CRM dashboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CueDesk CRM | Pool and Snooker Table Management",
    description:
      "Manage pool and snooker table sessions, customers, dues, analytics, and revenue from one installable dashboard.",
    images: ["/pool-crm-dashboard.png"],
  },
  appleWebApp: {
    capable: true,
    title: "CueDesk CRM",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "CueDesk CRM",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#337418",
    "msapplication-TileImage": "/icons/cue-master-logo-384.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#337418",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-white text-zinc-950">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
