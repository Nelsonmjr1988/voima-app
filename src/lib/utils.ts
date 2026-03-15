export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return formatCurrency(value);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  // Empresa
  onboarding: { label: 'Onboarding', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  ativo: { label: 'Ativo', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  inativo: { label: 'Inativo', color: 'text-gray-400', bg: 'bg-gray-400/10' },
  suspenso: { label: 'Suspenso', color: 'text-red-400', bg: 'bg-red-400/10' },
  // Obra
  ativa: { label: 'Ativa', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  pausada: { label: 'Pausada', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  concluida: { label: 'Concluída', color: 'text-gray-400', bg: 'bg-gray-400/10' },
  cancelada: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-400/10' },
  // Pedido Compra
  rascunho: { label: 'Rascunho', color: 'text-gray-400', bg: 'bg-gray-400/10' },
  aguardando_aprovacao: { label: 'Aguardando', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  aprovado: { label: 'Aprovado', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  cotando: { label: 'Cotando', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  ordem_gerada: { label: 'OC Gerada', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  parcial_entregue: { label: 'Parcial', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  entregue: { label: 'Entregue', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  // Cotação
  enviada: { label: 'Enviada', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  respondida: { label: 'Respondida', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  sem_resposta: { label: 'Sem Resposta', color: 'text-gray-400', bg: 'bg-gray-400/10' },
  selecionada: { label: 'Selecionada', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  recusada: { label: 'Recusada', color: 'text-red-400', bg: 'bg-red-400/10' },
  expirada: { label: 'Expirada', color: 'text-gray-400', bg: 'bg-gray-400/10' },
  // Ordem Compra
  emitida: { label: 'Emitida', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  confirmada: { label: 'Confirmada', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  em_entrega: { label: 'Em Entrega', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  paga: { label: 'Paga', color: 'text-gray-400', bg: 'bg-gray-400/10' },
  // Fornecedor tipo
  industria: { label: 'Indústria', color: 'text-red-400', bg: 'bg-red-400/10' },
  distribuidor: { label: 'Distribuidor', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  representante: { label: 'Representante', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  varejo: { label: 'Varejo', color: 'text-amber-400', bg: 'bg-amber-400/10' },
};
