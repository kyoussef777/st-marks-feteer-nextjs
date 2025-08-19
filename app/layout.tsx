import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "./components/AuthProvider";
import { OrdersProvider } from "../lib/orders-context";
import ConditionalNavbar from "./components/ConditionalNavbar";
import ErrorBoundary from "./components/ErrorBoundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "St. Mark's Sweets & Feteer - Order Management",
  description: "Order management system for St. Mark's Sweets & Feteer store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}
      >
        <ErrorBoundary>
          <AuthProvider>
            <ErrorBoundary>
              <OrdersProvider>
                <ErrorBoundary>
                  <ConditionalNavbar />
                  <main className="min-h-screen">
                    {children}
                  </main>
                </ErrorBoundary>
              </OrdersProvider>
            </ErrorBoundary>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

