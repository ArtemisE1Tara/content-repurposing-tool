import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"
import { Inter as FontSans } from "next/font/google"

// Load Inter as the main font
export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata = {
  title: "Contentful.AI",
  description: "Transform media for multiple platforms with AI",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`min-h-screen antialiased ${fontSans.variable}`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}