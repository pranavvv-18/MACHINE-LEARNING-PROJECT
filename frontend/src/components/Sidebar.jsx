import React from "react";
import { NavLink } from "react-router-dom";

const NAV = [
  { to: "/", label: "Dashboard", icon: "◧" },
  { to: "/dataset", label: "Dataset", icon: "⛁" },
  { to: "/understanding", label: "Data Understanding", icon: "◔" },
  { to: "/preprocessing", label: "Preprocessing", icon: "⚙" },
  { to: "/eda", label: "EDA", icon: "▤" },
  { to: "/features", label: "Feature Engineering", icon: "✦" },
  { to: "/split", label: "Train/Test Split", icon: "⤨" },
  { to: "/training", label: "Model Training", icon: "◍" },
  { to: "/comparison", label: "Ridge vs Lasso", icon: "⇄" },
  { to: "/prediction", label: "Prediction", icon: "➤" },
  { to: "/monitoring", label: "Monitoring", icon: "◎" },
  { to: "/info", label: "Project Information", icon: "ℹ" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 glass rounded-none border-r border-white/10 border-t-0 border-l-0 border-b-0 flex flex-col">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center font-bold text-[#0a0e1a]">
            RL
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Demand Forecast</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Ridge · Lasso ML</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                isActive
                  ? "bg-accent/15 text-white border border-accent/30 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`
            }
          >
            <span className="w-4 text-center opacity-80">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10 text-[10px] text-slate-500 leading-relaxed">
        Academic ML Project
      </div>
    </aside>
  );
}

