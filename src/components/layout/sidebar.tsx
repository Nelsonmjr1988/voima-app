'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, HardHat, ShoppingCart, FileText,
  Package, Factory, MessageSquare, DollarSign, ChevronLeft, ChevronRight,
  ExternalLink, Bot, Zap
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/empresas', icon: Building2, label: 'Empresas' },
  { href: '/obras', icon: HardHat, label: 'Obras' },
  { href: '/pedidos', icon: ShoppingCart, label: 'Pedidos (PC)' },
  { href: '/cotacoes', icon: FileText, label: 'Cotações' },
  { href: '/ordens', icon: Package, label: 'Ordens (OC)' },
  { href: '/fornecedores', icon: Factory, label: 'Fornecedores' },
  { href: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { href: '/admin/custos-tokens', icon: Zap, label: 'Custos de Tokens' },
  { href: '/chat', icon: Bot, label: 'Chat Voima' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside className={cn(
      'flex flex-col bg-dark-surface border-r border-dark-border transition-all duration-200 shrink-0',
      collapsed ? 'w-16' : 'w-56'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 border-b border-dark-border min-h-[64px]',
        collapsed ? 'px-3 justify-center' : 'px-4'
      )}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-voima-700 to-voima-500 flex items-center justify-center text-white font-black text-sm shrink-0">
          V
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-extrabold tracking-tight">VOIMA</div>
            <div className="text-[9px] text-voima-500 uppercase tracking-widest">Plataforma</div>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {menuItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg transition-all text-sm',
                collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5',
                active
                  ? 'bg-voima-500/10 text-voima-400 font-semibold'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-dark-surface2'
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Portal do Cliente */}
      <div className="px-2 pb-2">
        <Link href="/portal-admin"
          className={cn('flex items-center gap-3 rounded-lg transition-all text-sm border border-voima-500/20 bg-voima-500/5 hover:bg-voima-500/10',
            collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5', 'text-voima-500')}>
          <ExternalLink size={16} className="shrink-0" />
          {!collapsed && <span className="text-[12px] font-semibold">Portal Cliente</span>}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-dark-border text-gray-600 hover:text-gray-400 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}

export function PageHeader({
  title, subtitle, action, actions
}: {
  title: string; subtitle?: string; action?: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {(action || actions) && <div className="flex gap-2">{action}{actions}</div>}
    </div>
  );
}
