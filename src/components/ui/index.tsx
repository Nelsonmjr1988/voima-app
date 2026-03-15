'use client';

import React from 'react';
import { cn, statusLabels } from '@/lib/utils';

// ============================================
// STATUS BADGE
// ============================================
export function StatusBadge({ status }: { status: string }) {
  const config = statusLabels[status] || { label: status, color: 'text-gray-400', bg: 'bg-gray-400/10' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider', config.color, config.bg)}>
      {config.label}
    </span>
  );
}

// ============================================
// STAT CARD
// ============================================
export function StatCard({
  label, value, sub, icon, color = 'text-white'
}: {
  label: string; value: string; sub?: string; icon?: string; color?: string;
}) {
  return (
    <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[11px] text-gray-500 uppercase tracking-widest mb-1.5">{label}</div>
          <div className={cn('text-2xl font-extrabold tracking-tight', color)}>{value}</div>
          {sub && <div className="text-[11px] text-gray-500 mt-1">{sub}</div>}
        </div>
        {icon && <span className="text-2xl opacity-40">{icon}</span>}
      </div>
    </div>
  );
}

// ============================================
// PROGRESS BAR
// ============================================
export function ProgressBar({
  value, max = 100, color = 'bg-voima-500', height = 'h-1.5'
}: {
  value: number; max?: number; color?: string; height?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={cn('bg-dark-border rounded-full overflow-hidden w-full', height)}>
      <div
        className={cn('rounded-full transition-all duration-700', height, color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ============================================
// BUTTON
// ============================================
export function Button({
  children, onClick, variant = 'default', size = 'md', className
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
}) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all cursor-pointer';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  const variants = {
    default: 'bg-transparent border border-dark-border2 text-gray-400 hover:text-white hover:border-gray-500',
    primary: 'bg-voima-500 text-black hover:bg-voima-400 border-none',
    danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
    ghost: 'text-gray-400 hover:text-white hover:bg-dark-surface2',
  };
  return (
    <button onClick={onClick} className={cn(base, sizes[size], variants[variant], className)}>
      {children}
    </button>
  );
}

// ============================================
// EMPTY STATE
// ============================================
export function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md">{description}</p>
    </div>
  );
}

// ============================================
// LOADING SPINNER
// ============================================
export function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-voima-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
