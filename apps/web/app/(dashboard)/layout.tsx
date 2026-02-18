"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  LayoutDashboard,
  User,
  Briefcase,
  Target,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Settings,
  Network,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/profiles", label: "Profiles", icon: User },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/matches", label: "Matches", icon: Target },
  { href: "/dashboard/interview-prep", label: "Interview Prep", icon: MessageSquare },
  { href: "/dashboard/architecture", label: "Architecture", icon: Network },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg-primary">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border-primary bg-bg-secondary transition-[width] duration-200 ease-in-out ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border-primary px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple">
              <Brain className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold text-text-primary">
                AgentHire
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-secondary"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent-blue/10 text-accent-blue"
                        : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                    } ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings link at bottom */}
        <div className="border-t border-border-primary px-2 py-4">
          <button
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-secondary ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 transition-[margin] duration-200 ease-in-out ${
          collapsed ? "ml-16" : "ml-60"
        }`}
      >
        <div className="mx-auto min-h-screen max-w-7xl p-5 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
