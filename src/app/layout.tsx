import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layouts/AppLayout";
import { ThemeProvider } from "@/components/theme/theme-provider";
import SupabaseProvider from "@/utils/supabase/provider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Koro.ai - Voice-First Subject Tutor",
  description: "Your personal AI-powered learning companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SupabaseProvider>
            <AppLayout>
              {children}
            </AppLayout>
            <Toaster richColors position="top-right" />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
