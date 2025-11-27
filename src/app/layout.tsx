import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "JOBMÉLAN - Match • Merge • Align",
  description: "AI-powered resume optimization tool. Match • Merge • Align.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get Clerk publishable key from environment
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // Warn if key is missing (but don't fail during build)
  if (!clerkPublishableKey && process.env.NODE_ENV === 'production') {
    console.warn('⚠️ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Please add it to your Vercel environment variables.');
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <html lang="en">
        <body
          className={`${outfit.variable} ${plusJakartaSans.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
