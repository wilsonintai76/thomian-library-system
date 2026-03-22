import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thomian Library Kiosk",
  description: "Self-service kiosk for Thomian Library System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
