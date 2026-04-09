"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PieChart,
  TrendingUp,
  Target,
  CalendarDays,
  BarChart3,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/SidebarContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/rules", label: "Rules", icon: SlidersHorizontal },
  { href: "/budget", label: "Budget", icon: PieChart },
  { href: "/insights", label: "Insights", icon: TrendingUp },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/cashflow", label: "Cashflow", icon: CalendarDays },
  { href: "/net-worth", label: "Net Worth", icon: BarChart3 },
];

export function Sidebar() {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={close}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo + close button */}
        <div className="flex flex-col items-center pt-6 pb-4 px-6 border-b border-sidebar-border relative">
          <button
            onClick={close}
            className="md:hidden absolute top-3 right-4 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <Image
            src="/LazyBudgetLogo.png"
            alt="LazyBudget"
            width={80}
            height={80}
          />
          <span className="mt-3 text-lg font-bold text-sidebar-foreground tracking-tight">
            LazyBudget
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50 text-center">
            Connected via Akahu
          </p>
        </div>
      </aside>
    </>
  );
}
