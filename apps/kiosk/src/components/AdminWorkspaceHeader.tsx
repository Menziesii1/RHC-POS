import { ArrowLeft, Package, BarChart3, ReceiptText } from "lucide-react";
import type { ReactNode } from "react";

interface AdminWorkspaceHeaderProps {
  title: string;
  eyebrow: string;
  description: string;
  activeTab: "inventory" | "analytics" | "transactions";
  onSelectTab: (tab: "inventory" | "analytics" | "transactions") => void;
  onClose: () => void;
  actions?: ReactNode;
}

const TAB_ICONS = { inventory: Package, analytics: BarChart3, transactions: ReceiptText };

export function AdminWorkspaceHeader({ title, eyebrow, description, activeTab, onSelectTab, onClose, actions }: AdminWorkspaceHeaderProps) {
  return (
    <div className="mb-6 overflow-hidden rounded-xl">
      <div className="bg-[var(--bg-elevated)] px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#1be4db]">{eyebrow}</div>
            <div className="mt-3 font-display text-3xl font-extrabold text-[var(--text-primary)] md:text-4xl">{title}</div>
            <div className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">{description}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            <button type="button" className="flex items-center gap-1.5 rounded-xl bg-[var(--overlay-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--overlay-hover)]" onClick={onClose}>
              <ArrowLeft size={15} /> Back to Register
            </button>
          </div>
        </div>
      </div>
      <div className="flex bg-[var(--bg-surface)]">
        {(
          [["inventory", "Inventory Control"], ["analytics", "Analytics"], ["transactions", "Transactions"]] as const
        ).map(([key, label]) => {
          const Icon = TAB_ICONS[key];
          return (
            <button
              key={key} type="button"
              className={`flex flex-1 items-center gap-2 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === key ? "bg-[#1be4db]/10 text-[#1be4db]" : "text-[var(--text-dimmer)] hover:text-[var(--text-muted)]"
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
