"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Activity,
  KeyRound,
  HardDrive,
  IndianRupee,
  ChevronLeft,
  Menu,
} from "lucide-react";

interface SidebarLink {
  title: string;
  icon: React.ElementType;
  href: string;
}

interface SidebarGroup {
  label: string;
  links: SidebarLink[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    label: "Overview",
    links: [
      { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    ],
  },
  {
    label: "Management",
    links: [
      { title: "Users", icon: Users, href: "/users" },
      { title: "Accept Approvals", icon: Users, href: "/accept_approvals" },
      { title: "Transactions", icon: ArrowLeftRight, href: "/transactions" },
      { title: "Monitor Logs", icon: Activity, href: "/monitor_logs" },
    ],
  },
  {
    label: "Configuration",
    links: [
      { title: "Set Credentials", icon: KeyRound, href: "/setCredentials" },
      { title: "S3 Upload", icon: HardDrive, href: "/s3" },
      { title: "API Pricing", icon: IndianRupee, href: "/api_pricing" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed left-0 top-14 z-40 flex h-[calc(100vh-56px)] flex-col border-r border-white/[0.06] bg-[#05070B]/95 backdrop-blur-xl"
    >
      {/* Toggle button */}
      <div
        className={cn(
          "flex items-center px-3 py-4",
          collapsed ? "justify-center" : "justify-end",
        )}
      >
        <button
          onClick={onToggle}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
        >
          {collapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="scrollbar-custom flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {sidebarGroups.map((group) => (
          <div key={group.label}>
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              {group.links.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                      collapsed && "justify-center",
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-400"
                        transition={{
                          duration: 0.3,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                      />
                    )}

                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 transition",
                        isActive
                          ? "text-emerald-400"
                          : "text-slate-500 group-hover:text-slate-300",
                      )}
                    />

                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="truncate whitespace-nowrap"
                        >
                          {link.title}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Tooltip when collapsed */}
                    {collapsed && (
                      <div className="pointer-events-none absolute left-full ml-2 hidden rounded-xl border border-white/10 bg-[#0C0F16] px-3 py-1.5 text-xs font-medium text-white shadow-xl group-hover:block">
                        {link.title}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom brand */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-t border-white/[0.06] px-4 py-3"
          >
            <p className="text-[10px] font-medium tracking-wider text-slate-600">
              SCANINFOGA ADMIN
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
};

export default Sidebar;
