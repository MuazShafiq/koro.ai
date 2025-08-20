import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Koro.ai - Voice-First Subject Tutor",
  description: "Your personal AI-powered learning companion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}