import React from "react";

export function PageHeader({ title, subtitle, badge }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {badge && <span className="badge bg-accent/15 text-accent border border-accent/30">{badge}</span>}
      </div>
      {subtitle && <p className="text-slate-400 mt-1 text-sm max-w-3xl">{subtitle}</p>}
    </div>
  );
}

export function Card({ title, children, className = "", right = null }) {
  return (
    <div className={`glass glass-hover p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function KPI({ label, value, sub, accent = "accent" }) {
  const colors = {
    accent: "text-accent",
    accent2: "text-accent2",
    pink: "text-[#f0a6e8]",
    amber: "text-amber-300",
  };
  return (
    <div className="glass glass-hover p-4">
      <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colors[accent] || colors.accent} mono`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export function WhatIsThis({ title, children }) {
  return (
    <div className="glass p-4 border-l-2 border-accent2/50 bg-accent2/5">
      <div className="text-xs font-semibold text-accent2 mb-1 uppercase tracking-wide">💡 {title}</div>
      <div className="text-sm text-slate-300 leading-relaxed">{children}</div>
    </div>
  );
}

export function Loader({ text = "Working..." }) {
  return (
    <div className="flex items-center gap-3 text-slate-400 text-sm py-6 justify-center">
      <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      {text}
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="glass p-4 border border-red-400/30 bg-red-500/10 text-red-300 text-sm mb-4">
      ⚠ {message}
    </div>
  );
}

export function Button({ children, onClick, disabled, variant = "primary", className = "" }) {
  const base = "px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-gradient-to-r from-accent to-[#5a7de0] text-white shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5",
    ghost: "glass glass-hover text-slate-200",
    success: "bg-gradient-to-r from-accent2 to-[#4fc7a8] text-[#04211a] shadow-lg shadow-accent2/20 hover:-translate-y-0.5",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Table({ columns, rows }) {
  return (
    <div className="scroll-x">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-white/10">
            {columns.map((c) => (
              <th key={c} className="py-2 pr-4 font-medium whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.03]">
              {row.map((cell, j) => (
                <td key={j} className="py-2 pr-4 text-slate-300 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusPill({ ok, okText = "Ready", noText = "Pending" }) {
  return (
    <span
      className={`badge ${ok ? "bg-accent2/15 text-accent2 border border-accent2/30" : "bg-white/5 text-slate-400 border border-white/10"}`}
    >
      {ok ? okText : noText}
    </span>
  );
}

