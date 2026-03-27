import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LazyBudget",
  description: "Personal finance tracking powered by Akahu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="h-full bg-background text-foreground">
        <TooltipProvider>
          <div className="flex h-full">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-0 ml-60">
              {children}
            </div>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
