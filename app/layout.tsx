import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LigaBoss Hub",
  description: "Внутренний инструмент отдела продаж",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
