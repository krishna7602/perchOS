import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perch — Pull Up a Seat",
  description: "Scan a QR, join the conversation, browse the menu, and order — all from your phone.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
