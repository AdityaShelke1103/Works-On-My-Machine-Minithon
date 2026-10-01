import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Information Guardian",
  description: "Decides how much of your attention each piece of information deserves.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
