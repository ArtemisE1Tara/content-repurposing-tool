import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"
import { Inter as FontSans } from "next/font/google"
import { ClerkProvider } from '@clerk/nextjs'

// Load Inter as the main font
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata = {
  title: "Contentful.AI",
  description: "Condense already existing articles into platform-optimized social media captions and email snippets using the latest AI technology.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body className={`antialiased ${fontSans.variable}`}>
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}