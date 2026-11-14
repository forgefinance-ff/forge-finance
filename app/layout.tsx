import type { Metadata, Viewport } from "next";
import { Onest, Outfit } from "next/font/google";

import "./globals.css";
import "./motion.css";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { InvalidShake } from "@/components/motion";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";

const display = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-app-display",
});

const text = Onest({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-app-text",
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
    { media: "(prefers-color-scheme: light)", color: "#f2f1f5" },
    { media: "(prefers-color-scheme: dark)", color: "#16181f" },
  ],
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${display.variable} ${text.variable}`}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delay={150}>
            {children}
            <Toaster richColors position="top-right" />
            <InvalidShake />
            <RegisterServiceWorker />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
