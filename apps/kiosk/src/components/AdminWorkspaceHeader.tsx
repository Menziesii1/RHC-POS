import { ArrowLeft, Package, BarChart3 } from "lucide-react";
import type { ReactNode } from "react";

interface AdminWorkspaceHeaderProps {
  title: string;
  eyebrow: string;
  description: string;
  activeTab: "inventory" | "analytics";
  onSelectTab: (tab: "inventory" | "analytics") => void;
  onClose: () => void;
  actions?: ReactNode;
}

const TAB_ICONS = { inventory: Package, analytics: BarChart3 };

export function AdminWorkspaceHeader({ title, eyebrow, description, activeTab, onSelectTab, onClose, actions }: AdminWorkspaceHeaderProps) {
  return (
    <div className="mb-6 overflow-hidden rounded-xl">
      <div className="bg-[#162231] px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">{eyebrow}</div>
            <div className="mt-3 font-display text-3xl font-extrabold text-white md:text-4xl">{title}</div>
            <div className="mt-2 max-w-2xl text-sm text-white/40">{description}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            <button type="button" className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/50 hover:bg-white/[0.07]" onClick={onClose}>
              <ArrowLeft size={15} /> Back to Register
            </button>
          </div>
        </div>
      </div>
      <div className="flex bg-[#0c1520]">
        {(
          [["inventory", "Inventory Control"], ["analytics", "Analytics"]] as const
        ).map(([key, label]) => {
          const Icon = TAB_ICONS[key];
          return (
            <button
              key={key} type="button"
              className={`flex flex-1 items-center gap-2 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === key ? "bg-[#1be4db]/10 text-[#1be4db]" : "text-white/35 hover:text-white/50"
              }`}
              onClick={() => onSelectTab(key)}
            >
              <Icon size={15} /> {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
