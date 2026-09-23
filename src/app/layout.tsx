import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AKIM 5H — ЦЕНТР УПРАВЛЕНИЯ АСТАНОЙ",
  description: "Пять решений. Один городской бюджет. Множество последствий. Симулятор управления Астаной.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
