import type { Metadata } from "next";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "CueDesk CRM | Pool and Snooker Table Management",
  description:
    "A minimalist CRM dashboard for pool and snooker table owners to manage sessions, customers, pending amounts, analytics, and revenue.",
  manifest: "/manifest.webmanifest",
  applicationName: "CueDesk CRM",
  appleWebApp: {
    capable: true,
    title: "CueDesk CRM",
    statusBarStyle: "default",
  },
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
