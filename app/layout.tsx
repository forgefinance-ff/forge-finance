import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forge Finance",
  description: "Sistema de gestão financeira",
  applicationName: "Forge Finance",
  icons: {
    icon: "/icon-f.png",
    apple: "/icons/apple-touch-icon.png",
  },
  // iPhone: abre em tela cheia quando adicionado à Tela de Início.
  appleWebApp: {
    capable: true,
    title: "Forge",
    statusBarStyle: "black",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3fc" },
    { media: "(prefers-color-scheme: dark)", color: "#06060c" },
  ],
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delay={150}>
            {children}
            <Toaster richColors position="top-right" />
            <RegisterServiceWorker />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
