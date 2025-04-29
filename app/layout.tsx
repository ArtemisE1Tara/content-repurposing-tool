import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { dark } from "@clerk/themes";
import { Inter as FontSans } from "next/font/google"
import "./globals.css";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata = {
  title: "Content Repurposing Tool",
  description: "Instantly repurpose your content for social media, emails, and more with AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`antialiased ${fontSans.variable}`}>
          <ThemeProvider 
            attribute="class" 
            defaultTheme="system" 
            enableSystem
            themes={["light", "dark", "midnight-purple", "dark-topaz"]}
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}