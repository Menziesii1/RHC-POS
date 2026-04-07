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

export function AdminWorkspaceHeader({
  title,
  eyebrow,
  description,
  activeTab,
  onSelectTab,
  onClose,
  actions,
}: AdminWorkspaceHeaderProps) {
  return (
    <div className="mb-6 border border-[#d7e2f1] bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e2eaf4] px-6 py-5">
        <div>
          <div className="brand-kicker">{eyebrow}</div>
          <div className="mt-2 font-display text-4xl font-extrabold text-[#263362]">{title}</div>
          <div className="mt-2 max-w-3xl text-base text-[#263362]/70">{description}</div>
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <button type="button" className="touch-button bg-[#f7fbff] text-[#263362]" onClick={onClose}>
            Back To Register
          </button>
        </div>
      </div>

      <div className="flex">
        {[
          ["inventory", "Inventory Control"],
          ["analytics", "Analytics"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`border-r border-[#e2eaf4] px-6 py-4 text-sm font-bold uppercase tracking-[0.22em] last:border-r-0 ${
              activeTab === key ? "bg-[#263362] text-white" : "bg-[#f7fbff] text-[#263362]/65 hover:text-[#263362]"
            }`}
            onClick={() => onSelectTab(key as "inventory" | "analytics")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
