// src/components/admin/admin-dashboard.tsx
"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  PlusCircle,
  Users,
  BarChart3,
  CheckCircle2,
  Clock,
  Trash2,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  CreditCard,
  Copy,
  Check,
  UserPlus,
  FolderPlus,
  Target,
  ExternalLink,
  Settings,
  KeyRound,
  Bell,
} from "lucide-react";
import type {
  HydratedInvoice,
  CategoryRecord,
  StageBudgetRecord,
  ProjectSettingsRecord,
} from "@/lib/db";
import {
  toggleSplitStatusAction,
  settleAllUserSplitsAction,
  deleteInvoiceAction,
  createUserAction,
  createCategoryAction,
  updateStageBudgetAction,
  updateProjectSettingsAction,
  adminResetUserPasswordAction,
  deleteUserAction,
} from "@/actions/invoice-actions";
import { InvoiceMasterForm } from "@/components/admin/invoice-master-form";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { STAGES, DEFAULT_PIX_KEY } from "@/lib/constants";
import { toCents, fromCents } from "@/lib/split-calculator";

interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PARTICIPANT";
  avatarColor: string;
  phone: string | null;
  createdAt: string;
  totalPending: number;
  totalPaid: number;
  splitsCount: number;
}

interface AdminDashboardProps {
  invoices: HydratedInvoice[];
  users: AdminUserSummary[];
  categories: CategoryRecord[];
  stageBudgets: StageBudgetRecord[];
  projectSettings?: ProjectSettingsRecord;
  currentAdminId?: string;
}

export function AdminDashboard({
  invoices,
  users,
  categories,
  stageBudgets,
  projectSettings,
  currentAdminId,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "NEW_INVOICE" | "INVOICES" | "USERS_AND_CATEGORIES"
  >("OVERVIEW");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Filtros para a aba de Notas Fiscais
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "SETTLED">("ALL");
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      invoices.slice(0, 2).forEach((inv) => {
        initial[inv.id] = true;
      });
      return initial;
    }
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estados para Configurações Oficiais da Obra & PIX
  const [projectName, setProjectName] = useState(
    projectSettings?.projectName || "Residência • Controle de Obra"
  );
  const [officialPixKey, setOfficialPixKey] = useState(
    projectSettings?.officialPixKey || DEFAULT_PIX_KEY
  );
  const [pixReceiverName, setPixReceiverName] = useState(
    projectSettings?.pixReceiverName || "Ikaro (Administrador)"
  );
  const [applyPixToPending, setApplyPixToPending] = useState(true);

  // Estados para criação de Usuário (sem senha hardcoded)
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserRole, setNewUserRole] = useState<"PARTICIPANT" | "ADMIN">("PARTICIPANT");
  const [newUserColor, setNewUserColor] = useState("#C26D53");

  // Estados para redefinição de senha de participante pelo Admin
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");

  // Estados para criação de Categoria
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatBudget, setNewCatBudget] = useState("");

  // Estado para edição rápida de meta por etapa
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [stageBudgetInput, setStageBudgetInput] = useState<string>("");

  // ==========================================================================
  // MÉTRICAS CONSOLIDADAS DO DASHBOARD
  // ==========================================================================
  const metrics = useMemo(() => {
    const totalSpent = fromCents(
      invoices.reduce((acc, inv) => acc + toCents(inv.totalInvoiceValue), 0)
    );
    const totalPendingAll = fromCents(
      invoices.reduce((acc, inv) => acc + toCents(inv.pendingInvoiceValue), 0)
    );
    const totalPaidAll = fromCents(
      invoices.reduce((acc, inv) => acc + toCents(inv.paidInvoiceValue), 0)
    );
    const totalItemsCount = invoices.reduce(
      (acc, inv) => acc + inv.items.length,
      0
    );
    const totalBudgetPlanned = fromCents(
      stageBudgets.reduce((acc, b) => acc + toCents(Number(b.budgetLimit)), 0)
    );

    // Agrupamento por Etapa da Obra (stage)
    const stageMap = new Map<
      string,
      {
        stage: string;
        spent: number;
        itemsCount: number;
        pending: number;
        budget: number;
      }
    >();

    STAGES.forEach((st) => {
      const budgetObj = stageBudgets.find((b) => b.stage === st);
      stageMap.set(st, {
        stage: st,
        spent: 0,
        itemsCount: 0,
        pending: 0,
        budget: budgetObj ? Number(budgetObj.budgetLimit) : 30000,
      });
    });

    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const current = stageMap.get(item.stage) || {
          stage: item.stage,
          spent: 0,
          itemsCount: 0,
          pending: 0,
          budget: 25000,
        };
        current.spent = fromCents(
          toCents(current.spent) + toCents(item.totalValue)
        );
        current.itemsCount += 1;
        const itemPendingCents = item.splits
          .filter((s) => s.status === "PENDING")
          .reduce((sum, s) => sum + toCents(s.amountDue), 0);
        current.pending = fromCents(toCents(current.pending) + itemPendingCents);
        stageMap.set(item.stage, current);
      });
    });

    const stageBreakdown = Array.from(stageMap.values());

    return {
      totalSpent,
      totalPendingAll,
      totalPaidAll,
      totalItemsCount,
      totalBudgetPlanned,
      stageBreakdown,
    };
  }, [invoices, stageBudgets]);

  // Filtragem de Notas
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        inv.documentNumber.toLowerCase().includes(q) ||
        inv.supplier.toLowerCase().includes(q) ||
        inv.categoryName.toLowerCase().includes(q) ||
        inv.items.some((i) => i.description.toLowerCase().includes(q));

      const matchesCat =
        categoryFilter === "ALL" || inv.categoryId === categoryFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PENDING" && inv.pendingInvoiceValue > 0) ||
        (statusFilter === "SETTLED" && inv.pendingInvoiceValue === 0);

      return matchesQuery && matchesCat && matchesStatus;
    });
  }, [invoices, searchQuery, categoryFilter, statusFilter]);

  const toggleExpandInvoice = (id: string) => {
    setExpandedInvoiceIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleSplit = (splitId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await toggleSplitStatusAction(splitId);
      setFeedback({
        type: res.success ? "success" : "error",
        text: res.message,
      });
    });
  };

  const handleSettleAllUser = (userId: string, userName: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await settleAllUserSplitsAction(userId);
      setFeedback({
        type: res.success ? "success" : "error",
        text: `${userName}: ${res.message}`,
      });
    });
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteInvoiceAction(invoiceId);
      setFeedback({
        type: res.success ? "success" : "error",
        text: res.message,
      });
    });
  };

  const handleCopyWhatsAppReminder = async (user: AdminUserSummary) => {
    const text = `Olá ${
      user.name.split(" ")[0]
    }! Passando para atualizar o resumo da nossa obra: seu saldo pendente de reembolso atualmente é de ${formatCurrency(
      user.totalPending
    )}. Você pode conferir todos os itens detalhados e a chave PIX (${officialPixKey}) acessando o seu painel com o login ${
      user.email
    }.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(user.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // ignore
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "NF",
      "Fornecedor",
      "Data",
      "Categoria",
      "Parcelas",
      "Item",
      "Etapa",
      "Qtd",
      "Unid",
      "Valor Item (R$)",
      "Participante",
      "Cota Participante (R$)",
      "Status Cota",
    ];

    const rows: string[][] = [];
    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        item.splits.forEach((split) => {
          rows.push([
            inv.documentNumber,
            `"${inv.supplier.replace(/"/g, '""')}"`,
            formatDateBR(inv.date),
            `"${inv.categoryName}"`,
            String(inv.installments),
            `"${item.description.replace(/"/g, '""')}"`,
            `"${item.stage}"`,
            String(item.quantity),
            item.unit,
            item.totalValue.toFixed(2),
            `"${split.userName}"`,
            split.amountDue.toFixed(2),
            split.status === "PAID" ? "PAGO" : "PENDENTE",
          ]);
        });
      });
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `relatorio-controle-obra-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateProjectSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await updateProjectSettingsAction({
        projectName,
        officialPixKey,
        pixReceiverName,
        applyToPendingInvoices: applyPixToPending,
        updatePendingInvoicesPix: applyPixToPending,
      });
      setFeedback({
        type: res.success ? "success" : "error",
        text: res.message,
      });
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await createUserAction({
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        role: newUserRole,
        phone: newUserPhone,
        avatarColor: newUserColor,
      });
      setFeedback({
        type: res.success ? "success" : "error",
        text: res.message,
      });
      if (res.success) {
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPass("");
        setNewUserPhone("");
      }
    });
  };

  const handleResetUserPassword = (targetUserId: string) => {
    if (!resetPasswordInput || resetPasswordInput.trim().length < 6) {
      setFeedback({
        type: "error",
        text: "A nova senha do participante deve ter no mínimo 6 caracteres.",
      });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await adminResetUserPasswordAction({
        targetUserId,
        newPassword: resetPasswordInput,
      });
      setFeedback({
        type: res.success ? "success" : "error",
        text: res.message,
      });
      if (res.success) {
        setResettingUserId(null);
        setResetPasswordInput("");
      }
    });
  };

  const handleDeleteUser = (targetUserId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteUserAction({ targetUserId });
      setFeedback({
        type: res.success ? "success" : "error",
        text: res.message,
      });
    });
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await createCategoryAction({
        name: newCatName,
        description: newCatDesc,
        budgetLimit: newCatBudget ? parseFloat(newCatBudget) : undefined,
      });
      setFeedback({
        type: res.success ? "success" : "error",
        text: res.message,
      });
      if (res.success) {
        setNewCatName("");
        setNewCatDesc("");
        setNewCatBudget("");
      }
    });
  };

  const handleSaveStageBudget = (stage: string) => {
    const val = parseFloat(stageBudgetInput);
    if (Number.isNaN(val) || val < 0) return;
    startTransition(async () => {
      const res = await updateStageBudgetAction({
        stage,
        budgetLimit: val,
      });
      setFeedback({
        type: res.success ? "success" : "error",
        text: res.message,
      });
      setEditingStage(null);
    });
  };

  return (
    <div className="space-y-10">
      {/* Cabeçalho Principal + Botões de Ação */}
      <div className="flex flex-col justify-between gap-6 border-b border-[#E6E1DA] pb-8 lg:flex-row lg:items-end">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#78716C]">
            Painel Executivo do Administrador • Warm Minimalism
          </span>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#1C1917] md:text-4xl">
            Controle Financeiro & Logístico da Obra
          </h1>
          <p className="mt-1 text-sm text-[#78716C]">
            Gerencie notas fiscais, acompanhe a execução por etapa construtiva e dê baixa nas cotas de cada participante.
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#E6E1DA] bg-white px-4 py-3 text-xs font-semibold text-[#1C1917] shadow-2xs transition-colors hover:bg-[#F3EFEA]"
          >
            <Download className="h-4 w-4 text-[#78716C]" />
            Exportar Planilha (CSV)
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                activeTab === "NEW_INVOICE" ? "OVERVIEW" : "NEW_INVOICE"
              )
            }
            className="inline-flex items-center gap-2 rounded-2xl bg-[#292524] px-5 py-3 text-xs font-semibold text-[#FAF8F5] shadow-sm transition-all hover:bg-[#1C1917]"
          >
            <PlusCircle className="h-4 w-4 text-[#C26D53]" />
            {activeTab === "NEW_INVOICE"
              ? "Voltar ao Resumo"
              : "Lançar Nova Nota Fiscal"}
          </button>
        </div>
      </div>

      {/* Feedback Toast Global */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-sm font-medium ${
            feedback.type === "success"
              ? "border-[#4D6B53]/30 bg-[#4D6B53]/10 text-[#364D3B]"
              : "border-[#C26D53]/30 bg-[#C26D53]/10 text-[#9A4B34]"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cards de KPIs Globais da Obra */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-[#E6E1DA] bg-white p-7 shadow-[0_12px_32px_-8px_rgba(28,25,23,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Total Gasto na Obra
            </span>
            <span className="rounded-full bg-[#F3EFEA] px-3 py-1 text-xs font-semibold text-[#1C1917]">
              {invoices.length} {invoices.length === 1 ? "NF" : "NFs"}
            </span>
          </div>
          <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#1C1917]">
            {formatCurrency(metrics.totalSpent)}
          </p>
          <p className="mt-4 text-xs text-[#78716C]">
            Distribuído em <strong>{metrics.totalItemsCount} itens</strong> registrados.
          </p>
        </div>

        <div className="rounded-3xl border border-[#E6E1DA] bg-white p-7 shadow-[0_12px_32px_-8px_rgba(28,25,23,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Pendente de Acerto
            </span>
            <Clock className="h-4 w-4 text-[#C26D53]" />
          </div>
          <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#C26D53]">
            {formatCurrency(metrics.totalPendingAll)}
          </p>
          <p className="mt-4 text-xs text-[#78716C]">
            Soma das cotas aguardando transferência PIX dos participantes.
          </p>
        </div>

        <div className="rounded-3xl border border-[#E6E1DA] bg-white p-7 shadow-[0_12px_32px_-8px_rgba(28,25,23,0.04)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              Total Já Acertado / Pago
            </span>
            <CheckCircle2 className="h-4 w-4 text-[#4D6B53]" />
          </div>
          <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#4D6B53]">
            {formatCurrency(metrics.totalPaidAll)}
          </p>
          <p className="mt-4 text-xs text-[#78716C]">
            {metrics.totalSpent > 0
              ? `${Math.round(
                  (metrics.totalPaidAll / metrics.totalSpent) * 100
                )}% do valor total da obra já quitado.`
              : "100% em dia."}
          </p>
        </div>

        <div className="rounded-3xl border border-[#E6E1DA] bg-[#292524] p-7 text-[#FAF8F5] shadow-[0_12px_32px_-8px_rgba(28,25,23,0.12)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">
              Orçamento Global Planejado
            </span>
            <Target className="h-4 w-4 text-[#C26D53]" />
          </div>
          <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#FAF8F5]">
            {formatCurrency(metrics.totalBudgetPlanned)}
          </p>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[11px] text-[#D6D3D1]">
              <span>Execução Financeira</span>
              <strong>
                {metrics.totalBudgetPlanned > 0
                  ? Math.round(
                      (metrics.totalSpent / metrics.totalBudgetPlanned) * 100
                    )
                  : 0}
                %
              </strong>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[#C26D53]"
                style={{
                  width: `${Math.min(
                    100,
                    metrics.totalBudgetPlanned > 0
                      ? Math.round(
                          (metrics.totalSpent / metrics.totalBudgetPlanned) * 100
                        )
                      : 0
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Navegação por Abas do Painel Admin */}
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-[#E6E1DA] pb-4">
        {[
          {
            id: "OVERVIEW" as const,
            label: "Dashboard Resumo & Etapas",
            icon: BarChart3,
          },
          {
            id: "INVOICES" as const,
            label: `Notas Fiscais & Baixa de Cotas (${invoices.length})`,
            icon: FileText,
          },
          {
            id: "NEW_INVOICE" as const,
            label: "Cadastrar Nota Fiscal + Rateio",
            icon: PlusCircle,
          },
          {
            id: "USERS_AND_CATEGORIES" as const,
            label: `Participantes, Categorias & Config. da Obra`,
            icon: Users,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-semibold transition-all ${
                active
                  ? "bg-[#292524] text-[#FAF8F5] shadow-xs"
                  : "border border-[#E6E1DA] bg-white text-[#78716C] hover:bg-[#F3EFEA] hover:text-[#1C1917]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: DASHBOARD RESUMO (ETAPAS + CONCILIAÇÃO POR PARTICIPANTE)      */}
      {/* ==================================================================== */}
      {activeTab === "OVERVIEW" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Coluna Esquerda: Gráfico / Tabela Agrupada por Etapa da Obra */}
          <div className="rounded-3xl border border-[#E6E1DA] bg-white p-7 shadow-[0_12px_32px_-8px_rgba(28,25,23,0.04)] lg:col-span-7">
            <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#78716C]">
                  Análise por Stage
                </span>
                <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                  Despesas Agrupadas por Etapa da Obra
                </h2>
              </div>
              <span className="text-xs text-[#78716C]">
                Clique na meta para ajustar o orçamento
              </span>
            </div>

            <div className="space-y-5">
              {metrics.stageBreakdown.map((st) => {
                const percentOfBudget =
                  st.budget > 0 ? Math.round((st.spent / st.budget) * 100) : 0;
                const isOverBudget = st.spent > st.budget;

                return (
                  <div
                    key={st.stage}
                    className="rounded-2xl border border-[#E6E1DA]/80 bg-[#FAF8F5]/70 p-4 transition-colors hover:bg-[#FAF8F5]"
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-sm font-semibold text-[#1C1917]">
                            {st.stage}
                          </h3>
                          <span className="rounded-full bg-[#E6E1DA]/70 px-2.5 py-0.5 text-[10px] font-semibold text-[#1C1917]">
                            {st.itemsCount} {st.itemsCount === 1 ? "item" : "itens"}
                          </span>
                        </div>

                        {st.pending > 0 && (
                          <p className="mt-0.5 text-[11px] text-[#C26D53]">
                            Pendente de reembolso nesta etapa:{" "}
                            <strong>{formatCurrency(st.pending)}</strong>
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-display text-base font-semibold text-[#1C1917]">
                          {formatCurrency(st.spent)}
                        </span>
                        <div className="flex items-center justify-end gap-1.5 text-[11px] text-[#78716C]">
                          {editingStage === st.stage ? (
                            <div className="mt-1 flex items-center gap-1">
                              <input
                                type="number"
                                value={stageBudgetInput}
                                onChange={(e) =>
                                  setStageBudgetInput(e.target.value)
                                }
                                className="w-24 rounded-lg border border-[#292524] bg-white px-2 py-0.5 text-xs text-[#1C1917]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveStageBudget(st.stage)}
                                className="rounded-lg bg-[#292524] px-2 py-0.5 text-[10px] font-semibold text-white"
                              >
                                Salvar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStage(st.stage);
                                setStageBudgetInput(String(st.budget));
                              }}
                              className="underline decoration-dotted underline-offset-2 hover:text-[#1C1917]"
                            >
                              Meta: {formatCurrency(st.budget)} ({percentOfBudget}%)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progresso Visual */}
                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#E6E1DA]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverBudget
                            ? "bg-[#C26D53]"
                            : st.spent > 0
                            ? "bg-[#292524]"
                            : "bg-transparent"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            st.spent > 0 ? Math.max(4, percentOfBudget) : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita: Conciliação por Participante + Ações Rápidas */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-3xl border border-[#E6E1DA] bg-white p-7 shadow-[0_12px_32px_-8px_rgba(28,25,23,0.04)]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#78716C]">
                    Rateio & Reembolsos
                  </span>
                  <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                    Saldo por Participante
                  </h2>
                </div>
                <Users className="h-5 w-5 text-[#78716C]" />
              </div>

              <div className="space-y-4">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-2xl border border-[#E6E1DA] bg-[#FAF8F5] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-2xs"
                          style={{ backgroundColor: u.avatarColor }}
                        >
                          {u.name.charAt(0)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-[#1C1917]">
                              {u.name}
                            </h3>
                            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-[#78716C]">
                              {u.role}
                            </span>
                          </div>
                          <p className="text-xs text-[#78716C]">{u.email}</p>
                        </div>
                      </div>

                      <Link
                        href={`/meu-painel?userId=${u.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#E6E1DA] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#1C1917] transition-colors hover:bg-[#F3EFEA]"
                      >
                        <span>Ver Painel</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-white p-3">
                      <div>
                        <span className="block text-[10px] font-semibold uppercase text-[#78716C]">
                          Pendente
                        </span>
                        <span
                          className={`font-display text-base font-semibold ${
                            u.totalPending > 0
                              ? "text-[#C26D53]"
                              : "text-[#1C1917]"
                          }`}
                        >
                          {formatCurrency(u.totalPending)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold uppercase text-[#78716C]">
                          Quitado
                        </span>
                        <span className="font-display text-base font-semibold text-[#4D6B53]">
                          {formatCurrency(u.totalPaid)}
                        </span>
                      </div>
                    </div>

                    {u.totalPending > 0 && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopyWhatsAppReminder(u)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E1DA] bg-white px-3 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#F3EFEA]"
                        >
                          {copiedId === u.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[#4D6B53]" />
                              Resumo Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-[#78716C]" />
                              Copiar Cobrança WhatsApp
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleSettleAllUser(u.id, u.name)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#4D6B53] px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Quitar Tudo ({formatCurrency(u.totalPending)})
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: FORMULÁRIO MESTRE-DETALHE DE NOVA NOTA FISCAL                 */}
      {/* ==================================================================== */}
      {activeTab === "NEW_INVOICE" && (
        <InvoiceMasterForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatarColor: u.avatarColor,
          }))}
          defaultPixKey={officialPixKey}
          onSuccess={() => setActiveTab("INVOICES")}
        />
      )}

      {/* ==================================================================== */}
      {/* ABA 3: GERENCIADOR DE NOTAS FISCAIS, ITENS E BAIXA DE RATEIOS        */}
      {/* ==================================================================== */}
      {activeTab === "INVOICES" && (
        <section className="space-y-6">
          {/* Barra de Busca e Filtros */}
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-[#E6E1DA] bg-white p-5 shadow-2xs md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-3.5 left-4 h-4 w-4 text-[#A8A29E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nº da NF, fornecedor, item (ex: cimento, porcelanato)..."
                className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] py-2.5 pr-4 pl-11 text-sm text-[#1C1917] focus:border-[#292524] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-xs font-semibold text-[#1C1917] focus:outline-none"
              >
                <option value="ALL">Todas as Categorias</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "ALL" | "PENDING" | "SETTLED"
                  )
                }
                className="rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-xs font-semibold text-[#1C1917] focus:outline-none"
              >
                <option value="ALL">Todos os Status</option>
                <option value="PENDING">Com Rateio Pendente</option>
                <option value="SETTLED">100% Quitadas</option>
              </select>
            </div>
          </div>

          {/* Lista de Notas Fiscais */}
          {filteredInvoices.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#E6E1DA] bg-white p-12 text-center">
              <p className="text-sm font-semibold text-[#1C1917]">
                Nenhuma Nota Fiscal encontrada para os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredInvoices.map((inv) => {
                const isExpanded = !!expandedInvoiceIds[inv.id];
                const isFullyPaid = inv.pendingInvoiceValue === 0;

                return (
                  <article
                    key={inv.id}
                    className="overflow-hidden rounded-3xl border border-[#E6E1DA] bg-white shadow-[0_8px_24px_-8px_rgba(28,25,23,0.04)]"
                  >
                    {/* Cabeçalho da Nota Fiscal */}
                    <div className="flex flex-col justify-between gap-4 bg-white p-6 md:flex-row md:items-center">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isFullyPaid
                                ? "bg-[#4D6B53]/12 text-[#364D3B]"
                                : "bg-[#C26D53]/12 text-[#9A4B34]"
                            }`}
                          >
                            {isFullyPaid
                              ? "Nota 100% Acertada"
                              : `Pendente: ${formatCurrency(
                                  inv.pendingInvoiceValue
                                )}`}
                          </span>

                          <span className="rounded-full border border-[#E6E1DA] bg-[#FAF8F5] px-3 py-1 text-xs font-semibold text-[#1C1917]">
                            {inv.documentNumber}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3EFEA] px-3 py-1 text-xs font-medium text-[#78716C]">
                            <Layers className="h-3 w-3" />
                            {inv.categoryName}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3EFEA] px-3 py-1 text-xs font-medium text-[#78716C]">
                            <CreditCard className="h-3 w-3" />
                            {inv.installments}x
                          </span>

                          <span className="text-xs text-[#78716C]">
                            • {formatDateBR(inv.date)} • Pago na loja por:{" "}
                            <strong className="text-[#1C1917]">
                              {inv.paidBy}
                            </strong>
                          </span>
                        </div>

                        <h3 className="font-display text-xl font-semibold text-[#1C1917]">
                          {inv.supplier}
                        </h3>

                        {inv.observations && (
                          <p className="text-xs text-[#78716C]">
                            Obs: {inv.observations}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-5 border-t border-[#E6E1DA] pt-4 md:border-t-0 md:pt-0">
                        <div className="text-right">
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#78716C]">
                            Valor Total da Nota
                          </span>
                          <span className="font-display text-2xl font-semibold text-[#1C1917]">
                            {formatCurrency(inv.totalInvoiceValue)}
                          </span>
                          <span className="block text-[11px] text-[#78716C]">
                            PIX: {inv.pixKey}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleExpandInvoice(inv.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-xs font-semibold text-[#1C1917] transition-colors hover:bg-[#F3EFEA]"
                          >
                            <span>
                              {inv.items.length}{" "}
                              {inv.items.length === 1 ? "Item" : "Itens"}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(inv.id)}
                            disabled={isPending}
                            title="Excluir Nota Fiscal"
                            className="rounded-xl border border-[#E6E1DA] p-2.5 text-[#78716C] transition-colors hover:border-[#C26D53] hover:bg-[#C26D53]/10 hover:text-[#C26D53]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Detalhamento dos Itens e Rateios (ItemSplit) */}
                    {isExpanded && (
                      <div className="border-t border-[#E6E1DA] bg-[#FAF8F5]/70 p-6">
                        <div className="space-y-4">
                          {inv.items.map((item, idx) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-[#E6E1DA] bg-white p-5"
                            >
                              <div className="flex flex-col justify-between gap-2 border-b border-[#E6E1DA]/70 pb-3 sm:flex-row sm:items-center">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-[#292524] px-2 py-0.5 text-[10px] font-semibold text-white">
                                      Item #{idx + 1}
                                    </span>
                                    <h4 className="font-display text-base font-semibold text-[#1C1917]">
                                      {item.description}
                                    </h4>
                                  </div>
                                  <p className="mt-1 text-xs text-[#78716C]">
                                    Etapa: <strong>{item.stage}</strong> • Qtd:{" "}
                                    <strong>
                                      {item.quantity} {item.unit}
                                    </strong>{" "}
                                    • Modelo Rateio:{" "}
                                    <strong>{item.splitModel}</strong>
                                  </p>
                                </div>

                                <div className="text-right">
                                  <span className="block text-[10px] uppercase text-[#78716C]">
                                    Subtotal do Item
                                  </span>
                                  <span className="font-display text-lg font-semibold text-[#1C1917]">
                                    {formatCurrency(item.totalValue)}
                                  </span>
                                </div>
                              </div>

                              {/* Cotas dos Usuários neste Item */}
                              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {item.splits.map((split) => {
                                  const isPaid = split.status === "PAID";
                                  const hasParticipantNotice =
                                    !isPaid && Boolean(split.paymentNote);

                                  return (
                                    <div
                                      key={split.id}
                                      className={`flex flex-col justify-between gap-3 rounded-xl border p-3.5 ${
                                        isPaid
                                          ? "border-[#4D6B53]/25 bg-[#4D6B53]/5"
                                          : hasParticipantNotice
                                          ? "border-[#B8860B]/40 bg-[#B8860B]/10"
                                          : "border-[#C26D53]/30 bg-[#C26D53]/5"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                          <span
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                            style={{
                                              backgroundColor:
                                                split.userAvatarColor,
                                            }}
                                          >
                                            {split.userName.charAt(0)}
                                          </span>
                                          <div>
                                            <p className="text-xs font-semibold text-[#1C1917]">
                                              {split.userName}
                                            </p>
                                            <p className="font-display text-sm font-bold text-[#1C1917]">
                                              {formatCurrency(split.amountDue)}
                                            </p>
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          disabled={isPending}
                                          onClick={() =>
                                            handleToggleSplit(split.id)
                                          }
                                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                            isPaid
                                              ? "bg-[#4D6B53] text-white hover:bg-[#364D3B]"
                                              : "bg-[#C26D53] text-white hover:bg-[#9A4B34]"
                                          }`}
                                        >
                                          {isPaid
                                            ? "✓ Pago (Reverter)"
                                            : "Confirmar Recebimento (Marcar Pago)"}
                                        </button>
                                      </div>

                                      {/* Badge de aviso enviado pelo participante (âmbar #B8860B) */}
                                      {hasParticipantNotice && (
                                        <div className="flex items-start gap-1.5 rounded-lg border border-[#B8860B]/30 bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-[#785502]">
                                          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B8860B]" />
                                          <span>
                                            🔔 Aviso do Participante:{" "}
                                            <strong>{split.paymentNote}</strong>
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ==================================================================== */}
      {/* ABA 4: CONFIGURAÇÕES DA OBRA, PARTICIPANTES & CATEGORIAS             */}
      {/* ==================================================================== */}
      {activeTab === "USERS_AND_CATEGORIES" && (
        <div className="space-y-8">
          {/* Card 1: Configurações Oficiais da Obra & PIX */}
          <div className="rounded-3xl border border-[#E6E1DA] bg-white p-7 shadow-2xs">
            <div className="mb-6 flex items-center gap-2.5">
              <Settings className="h-5 w-5 text-[#292524]" />
              <div>
                <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                  Configurações Oficiais da Obra & PIX
                </h2>
                <p className="text-xs text-[#78716C]">
                  Defina o nome da obra e a chave PIX oficial que aparece por padrão nos lançamentos e no painel dos participantes.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleUpdateProjectSettings}
              className="grid grid-cols-1 gap-4 md:grid-cols-12"
            >
              <div className="md:col-span-4">
                <label className="mb-1 block text-xs font-semibold uppercase text-[#78716C]">
                  Nome Oficial da Obra
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Residência • Controle de Obra"
                  className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917]"
                />
              </div>

              <div className="md:col-span-4">
                <label className="mb-1 block text-xs font-semibold uppercase text-[#78716C]">
                  Chave PIX Oficial para Recebimento
                </label>
                <input
                  type="text"
                  required
                  value={officialPixKey}
                  onChange={(e) => setOfficialPixKey(e.target.value)}
                  placeholder="CPF, Celular, E-mail ou Chave Aleatória"
                  className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917]"
                />
              </div>

              <div className="md:col-span-4">
                <label className="mb-1 block text-xs font-semibold uppercase text-[#78716C]">
                  Titular Recebedor do PIX
                </label>
                <input
                  type="text"
                  required
                  value={pixReceiverName}
                  onChange={(e) => setPixReceiverName(e.target.value)}
                  placeholder="Ex: Ikaro (Administrador da Obra)"
                  className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917]"
                />
              </div>

              <div className="flex flex-col justify-between gap-4 pt-2 sm:flex-row sm:items-center md:col-span-12">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#1C1917]">
                  <input
                    type="checkbox"
                    checked={applyPixToPending}
                    onChange={(e) => setApplyPixToPending(e.target.checked)}
                    className="h-4 w-4 rounded border-[#E6E1DA] text-[#292524]"
                  />
                  <span>
                    Atualizar chave PIX em todas as notas fiscais pendentes
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#292524] px-6 py-3 text-xs font-semibold text-[#FAF8F5] transition-colors hover:bg-[#1C1917] disabled:opacity-60"
                >
                  Salvar Configurações da Obra & PIX
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Cadastro e Gestão de Participantes / Usuários */}
            <div className="rounded-3xl border border-[#E6E1DA] bg-white p-7 shadow-2xs lg:col-span-6">
              <div className="mb-6 flex items-center gap-2.5">
                <UserPlus className="h-5 w-5 text-[#C26D53]" />
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                    Cadastrar Novo Participante
                  </h2>
                  <p className="text-xs text-[#78716C]">
                    Adicione familiares, sócios ou cônjuge para vincular nos itens das notas e liberar acesso ao painel.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-[#78716C]">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Ex: Beatriz Almeida"
                      className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-[#78716C]">
                      E-mail de Login
                    </label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="beatriz@obra.com"
                      className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-[#78716C]">
                      Senha Inicial (mín. 6 caracteres)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newUserPass}
                      onChange={(e) => setNewUserPass(e.target.value)}
                      placeholder="Defina a senha inicial"
                      className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-[#78716C]">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-[#78716C]">
                      Perfil de Acesso (Role)
                    </label>
                    <select
                      value={newUserRole}
                      onChange={(e) =>
                        setNewUserRole(e.target.value as "PARTICIPANT" | "ADMIN")
                      }
                      className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917]"
                    >
                      <option value="PARTICIPANT">
                        PARTICIPANT (Acessa apenas Meu Painel)
                      </option>
                      <option value="ADMIN">ADMIN (Acesso Total)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-[#78716C]">
                      Cor de Identificação
                    </label>
                    <input
                      type="color"
                      value={newUserColor}
                      onChange={(e) => setNewUserColor(e.target.value)}
                      className="h-10 w-full cursor-pointer rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] p-1"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl bg-[#292524] py-3 text-xs font-semibold text-[#FAF8F5] transition-colors hover:bg-[#1C1917]"
                >
                  Cadastrar Usuário no Banco
                </button>
              </form>

              {/* Lista de Usuários Atuais com Redefinição de Senha e Exclusão */}
              <div className="mt-8 border-t border-[#E6E1DA] pt-6">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                  Usuários Cadastrados ({users.length})
                </h3>
                <div className="space-y-3">
                  {users.map((u) => {
                    const isSelf = currentAdminId === u.id;
                    const canDelete = !isSelf && u.role !== "ADMIN" && u.splitsCount === 0;
                    const isResetting = resettingUserId === u.id;

                    return (
                      <div
                        key={u.id}
                        className="rounded-2xl border border-[#E6E1DA] bg-[#FAF8F5] p-3.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-full font-bold text-white"
                              style={{ backgroundColor: u.avatarColor }}
                            >
                              {u.name.charAt(0)}
                            </span>
                            <div>
                              <p className="font-semibold text-[#1C1917]">
                                {u.name}
                              </p>
                              <p className="text-[#78716C]">
                                {u.email} • {u.splitsCount}{" "}
                                {u.splitsCount === 1 ? "cota" : "cotas"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-white px-2.5 py-1 font-semibold text-[#1C1917]">
                              {u.role}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setResettingUserId(isResetting ? null : u.id);
                                setResetPasswordInput("");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E6E1DA] bg-white px-2.5 py-1 font-medium text-[#1C1917] transition-colors hover:bg-[#F3EFEA]"
                            >
                              <KeyRound className="h-3 w-3 text-[#C26D53]" />
                              Redefinir Senha
                            </button>

                            {canDelete && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDeleteUser(u.id)}
                                title="Remover participante sem cotas vinculadas"
                                className="inline-flex items-center gap-1 rounded-lg border border-[#C26D53]/30 bg-[#C26D53]/10 px-2.5 py-1 font-medium text-[#9A4B34] transition-colors hover:bg-[#C26D53]/20"
                              >
                                <Trash2 className="h-3 w-3" />
                                Remover
                              </button>
                            )}
                          </div>
                        </div>

                        {isResetting && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#E6E1DA] pt-3">
                            <input
                              type="password"
                              minLength={6}
                              value={resetPasswordInput}
                              onChange={(e) =>
                                setResetPasswordInput(e.target.value)
                              }
                              placeholder="Nova senha (mín. 6 caracteres)"
                              className="flex-1 rounded-xl border border-[#E6E1DA] bg-white px-3 py-1.5 text-xs text-[#1C1917]"
                            />
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleResetUserPassword(u.id)}
                              className="rounded-xl bg-[#292524] px-3.5 py-1.5 text-xs font-semibold text-[#FAF8F5] hover:bg-[#1C1917]"
                            >
                              Salvar Nova Senha
                            </button>
                            <button
                              type="button"
                              onClick={() => setResettingUserId(null)}
                              className="rounded-xl px-2.5 py-1.5 text-xs text-[#78716C] hover:text-[#1C1917]"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Cadastro de Categorias de Notas Fiscais */}
            <div className="rounded-3xl border border-[#E6E1DA] bg-white p-7 shadow-2xs lg:col-span-6">
              <div className="mb-6 flex items-center gap-2.5">
                <FolderPlus className="h-5 w-5 text-[#4D6B53]" />
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                    Categorias de Notas Fiscais
                  </h2>
                  <p className="text-xs text-[#78716C]">
                    Classifique as notas mães (ex: Elétrica, Hidráulica, Fundação, Mão de Obra).
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-[#78716C]">
                    Nome da Categoria
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ex: Esquadrias de Alumínio & Vidros"
                    className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-[#78716C]">
                      Descrição Breve
                    </label>
                    <input
                      type="text"
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      placeholder="Janelas, portas e guarda-corpo"
                      className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-[#78716C]">
                      Teto Orçamentário (R$ Opcional)
                    </label>
                    <input
                      type="number"
                      step="100"
                      value={newCatBudget}
                      onChange={(e) => setNewCatBudget(e.target.value)}
                      placeholder="35000"
                      className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl bg-[#292524] py-3 text-xs font-semibold text-[#FAF8F5] transition-colors hover:bg-[#1C1917]"
                >
                  Adicionar Categoria
                </button>
              </form>

              <div className="mt-8 border-t border-[#E6E1DA] pt-6">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                  Categorias Ativas ({categories.length})
                </h3>
                <div className="space-y-2.5">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between rounded-2xl border border-[#E6E1DA] bg-[#FAF8F5] px-4 py-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-[#1C1917]">{cat.name}</p>
                        {cat.description && (
                          <p className="text-[#78716C]">{cat.description}</p>
                        )}
                      </div>
                      {cat.budgetLimit && (
                        <span className="rounded-lg bg-white px-2.5 py-1 font-semibold text-[#78716C]">
                          Meta: {formatCurrency(cat.budgetLimit)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
