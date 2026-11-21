import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/types";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

import {
  LayoutDashboard as LayoutDashboardIcon,
  BookOpen as BookOpenIcon,
  Table2 as TableIcon,
  Receipt as ReceiptIcon,
  Users as UsersIcon,
  BarChart3 as ChartIcon,
  Boxes as BoxesIcon,
  Settings as SettingsIcon,
  Wallet as WalletIcon,
  ChefHat as ChefHatIcon,
} from "lucide-react";

const ROLE_NAV: Record<Role, NavItem[]> = {
  owner: [
    { to: "/", label: "Overview", icon: LayoutDashboardIcon },
    { to: "/menu", label: "Menu", icon: BookOpenIcon },
    { to: "/tables", label: "Tables", icon: TableIcon },
    { to: "/orders", label: "Orders", icon: ReceiptIcon },
    { to: "/staff", label: "Staff", icon: UsersIcon },
    { to: "/reports", label: "Reports", icon: ChartIcon },
    { to: "/inventory", label: "Inventory", icon: BoxesIcon },
    { to: "/settings", label: "Settings", icon: SettingsIcon },
  ],
  waiter: [
    { to: "/", label: "Tables", icon: TableIcon },
    { to: "/orders", label: "Active Orders", icon: ReceiptIcon },
    { to: "/bills", label: "Bills & Payments", icon: WalletIcon },
  ],
  kitchen: [{ to: "/", label: "Kitchen Tickets", icon: ChefHatIcon }],
};

const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  waiter: "Waiter",
  kitchen: "Kitchen",
};

const ROLE_COLOR: Record<Role, string> = {
  owner: "bg-emerald-600",
  waiter: "bg-sky-600",
  kitchen: "bg-amber-600",
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { staff, restaurant, signOut } = useAuth();
  const navigate = useNavigate();
  const role = staff?.role ?? "waiter";
  const nav = ROLE_NAV[role];

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-stone-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-200 bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white shadow">
            🍽️
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-stone-900">
              {restaurant?.name ?? "Restaurant"}
            </p>
            <p className="text-xs text-stone-500">Management Suite</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-stone-200 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${ROLE_COLOR[role]}`}
            >
              {staff?.full_name?.charAt(0) ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-800">
                {staff?.full_name}
              </p>
              <p className="text-xs text-stone-500">{ROLE_LABEL[role]}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="font-display text-base font-bold text-stone-900">
            {restaurant?.name ?? "Restaurant"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${ROLE_COLOR[role]}`}
          >
            {ROLE_LABEL[role]}
          </span>
          <button onClick={handleSignOut} className="text-stone-500 hover:text-red-600">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex border-t border-stone-200 bg-white lg:hidden">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium transition ${
                isActive ? "text-emerald-700" : "text-stone-500"
              }`
            }
          >
            <item.icon size={20} />
            <span className="truncate">{item.label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </div>

      {/* Main */}
      <main className="flex-1 lg:pl-64">
        <div className="min-h-screen px-4 py-6 pt-16 pb-20 lg:px-8 lg:py-8 lg:pt-8 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-stone-900 lg:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = "emerald",
  hint,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: "emerald" | "sky" | "amber" | "red" | "stone";
  hint?: string;
}) {
  const accents: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    stone: "bg-stone-100 text-stone-600",
  };
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-500">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accents[accent]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-stone-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}
