"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarContext";

export function MenuToggleButton() {
  const { toggle } = useSidebar();
  return (
    <button
      onClick={toggle}
      className="md:hidden mr-3 text-foreground/70 hover:text-foreground"
      aria-label="Toggle menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
