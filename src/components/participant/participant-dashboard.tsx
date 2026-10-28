// src/components/participant/participant-dashboard.tsx
"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  Printer,
  Calendar,
  FileText,
  Layers,
  CreditCard,
  Eye,
  Sparkles,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import type { ProjectSettingsRecord } from "@/lib/db";
import {
  reportSplitPaymentNoticeAction,
  reportAllPendingSplitsNoticeAction,
} from "@/actions/invoice-actions";
import { toCents, fromCents } from "@/lib/split-calculator";

export type SerializedParticipantSplit = {
  id: string;
  amountDue: number;
  installmentValue: number;
  status: "PENDING" | "PAID";
  paidAt: string | null;
  paymentNote: string | null;
  item: {
    id: string;
    description: string;
    unit: string;
    quantity: number;
    totalItemValue: number;
    stage: string;
    splitModel: string;
  };
  invoice: {
    id: string;
    documentNumber: string;
    supplier: string;
    date: string;
    categoryName: string;
    installments: number;
    pixKey: string;
    paidBy: string;
    observations: string | null;
  };
};

interface ParticipantDashboardProps {
  userName: string;
  userEmail: string;
  isAdminViewer: boolean;
  isSimulatingOtherUser?: boolean;
  selectedUserId: string;
  availableUsers: { id: string; name: string; role: "ADMIN" | "PARTICIPANT" }[];
  splits: SerializedParticipantSplit[];
  totalPending: number;
  totalPaid: number;
  primaryPixKey: string;
  projectSettings?: ProjectSettingsRecord;
}

export function ParticipantDashboard({
  userName,
  userEmail,
  isAdminViewer,
  isSimulatingOtherUser = false,
  selectedUserId,
  availableUsers,
  splits,
  totalPending,
  totalPaid,
  primaryPixKey,
  projectSettings,
}: ParticipantDashboardProps) {
  const router = useRouter();
  const [isPendingTransition, startTransition] = useTransition();
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "PAID">("ALL");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Estados para aviso de pagamento PIX em lote (todas as cotas pendentes)
  const [showBatchNoticeForm, setShowBatchNoticeForm] = useState(false);
  const [batchNoteInput, setBatchNoteInput] = useState("");

  // Estados para aviso de pagamento PIX individual por cota
  const [reportingSplitId, setReportingSplitId] = useState<string | null>(null);
  const [splitNoteInput, setSplitNoteInput] = useState("");

  const stagesInSplits = useMemo(() => {
    const set = new Set(splits.map((s) => s.item.stage));
    return Array.from(set);
  }, [splits]);

  const filteredSplits = useMemo(() => {
    return splits.filter((split) => {
      const statusMatch = filter === "ALL" || split.status === filter;
      const stageMatch =
        stageFilter === "ALL" || split.item.stage === stageFilter;
      return statusMatch && stageMatch;
    });
  }, [splits, filter, stageFilter]);

  const pendingCount = splits.filter((s) => s.status === "PENDING").length;
  const paidCount = splits.filter((s) => s.status === "PAID").length;

  // Soma mensal estimada considerando o parcelamento de cada nota pendente
  const monthlyCommitment = useMemo(() => {
    return fromCents(
      splits
        .filter((s) => s.status === "PENDING")
        .reduce((acc, s) => acc + toCents(s.installmentValue), 0)
    );
  }, [splits]);

  const pixReceiverName =
    projectSettings?.pixReceiverName || "Ikaro (Administrador da Obra)";

  const handleCopyText = async (textToCopy: string, identifier: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedKey(identifier);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // Fallback
    }
  };

  const handleReportAllPending = (e: React.FormEvent) => {
    e.preventDefault();
    const noteToSend =
      batchNoteInput.trim() ||
      `Transferência PIX de ${formatCurrency(totalPending)} enviada pelo participante`;

    setFeedback(null);
    startTransition(async () => {
      const res = await reportAllPendingSplitsNoticeAction({
        note: noteToSend,
      });
      setFeedback({
        type: res.success ? "success" : "error",
        text: res.message,
      });
      if (res.success) {
        setShowBatchNoticeForm(false);
        setBatchNoteInput("");
      }
    });
  };

  const handleReportSingleSplit = (splitId: string, amountDue: number) => {
    const noteToSend =
      splitNoteInput.trim() ||
      `PIX de ${formatCurrency(amountDue)} enviado pelo participante`;

    setFeedback(null);
    startTransition(async () => {
      const res = await reportSplitPaymentNoticeAction({
        splitId,
        note: noteToSend,
      });
      setFeedback({
        type: res.success ? "success" : "error",
        text: res.message,
      });
      if (res.success) {
        setReportingSplitId(null);
        setSplitNoteInput("");
      }
    });
  };

  return (
    <div className="space-y-10">
      {/* Banner exclusivo para o Admin inspecionando a visão dos participantes */}
      {isAdminViewer && (
        <div className="no-print flex flex-col justify-between gap-4 rounded-2xl border border-[#292524]/15 bg-[#F3EFEA] px-5 py-3.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5 text-xs text-[#1C1917]">
            <Eye className="h-4 w-4 text-[#C26D53]" />
            <span>
              <strong>Modo Simulação do Administrador:</strong> Visualize exatamente como cada participante enxerga seus débitos e a sua chave PIX.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="viewerSelect"
              className="text-xs font-medium text-[#78716C]"
            >
              Ver painel de:
            </label>
            <select
              id="viewerSelect"
              value={selectedUserId}
              onChange={(e) =>
                router.push(`/meu-painel?userId=${e.target.value}`)
              }
              className="rounded-xl border border-[#E6E1DA] bg-white px-3 py-1.5 text-xs font-semibold text-[#1C1917] focus:outline-none"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Feedback de Aviso de Pagamento PIX */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-sm font-medium ${
            feedback.type === "success"
              ? "border-[#4D6B53]/30 bg-[#4D6B53]/10 text-[#364D3B]"
              : "border-[#C26D53]/30 bg-[#C26D53]/10 text-[#9A4B34]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#4D6B53]" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-[#C26D53]" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cabeçalho Warm Minimalism */}
      <header className="flex flex-col justify-between gap-6 border-b border-[#E6E1DA] pb-8 md:flex-row md:items-end">
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-[#78716C]">
            Portal do Participante • Extrato Individual de Rateio
          </span>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#1C1917] md:text-4xl">
            Olá, {userName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-[#78716C]">
            Conta vinculada: <strong>{userEmail}</strong> • Confira seus itens atribuídos, parcelamento das notas e realize o reembolso via PIX.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-2 rounded-2xl border border-[#E6E1DA] bg-white px-4 py-3 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#F3EFEA]"
          >
            <Printer className="h-4 w-4 text-[#78716C]" />
            Imprimir Extrato
          </button>

          <div className="rounded-2xl border border-[#E6E1DA] bg-white px-5 py-3 text-right shadow-2xs">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-[#78716C]">
              Total Acumulado (Sua Cota)
            </span>
            <span className="font-display text-lg font-semibold text-[#1C1917]">
              {formatCurrency(fromCents(toCents(totalPending) + toCents(totalPaid)))}
            </span>
          </div>
        </div>
      </header>

      {/* Grid Financeiro + Card de Pagamento PIX */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Card 1: Saldo Pendente */}
        <div className="flex flex-col justify-between rounded-3xl border border-[#E6E1DA] bg-white p-7 shadow-[0_12px_32px_-8px_rgba(28,25,23,0.04)] lg:col-span-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[#78716C]">
                Saldo Pendente (A Pagar)
              </span>
              <span className="rounded-full bg-[#C26D53]/12 px-3 py-1 text-xs font-semibold text-[#9A4B34]">
                {pendingCount}{" "}
                {pendingCount === 1 ? "item pendente" : "itens pendentes"}
              </span>
            </div>
            <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#C26D53]">
              {formatCurrency(totalPending)}
            </p>

            <div className="mt-4 rounded-2xl bg-[#FAF8F5] p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#78716C]">
                  Comprometimento por parcela:
                </span>
                <strong className="text-[#1C1917]">
                  ≈ {formatCurrency(monthlyCommitment)} / mês
                </strong>
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-[#78716C]">
            Soma das suas cotas em itens de notas fiscais aguardando acerto.
          </p>
        </div>

        {/* Card 2: Total Quitado */}
        <div className="flex flex-col justify-between rounded-3xl border border-[#E6E1DA] bg-white p-7 shadow-[0_12px_32px_-8px_rgba(28,25,23,0.04)] lg:col-span-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[#78716C]">
                Total Já Quitado
              </span>
              <span className="rounded-full bg-[#4D6B53]/12 px-3 py-1 text-xs font-semibold text-[#364D3B]">
                {paidCount} {paidCount === 1 ? "pago" : "pagos"}
              </span>
            </div>
            <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#4D6B53]">
              {formatCurrency(totalPaid)}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs text-[#78716C]">
              <span>Progresso de Quitação</span>
              <strong className="text-[#1C1917]">
                {totalPending + totalPaid > 0
                  ? Math.round((totalPaid / (totalPending + totalPaid)) * 100)
                  : 100}
                %
              </strong>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3EFEA]">
              <div
                className="h-full rounded-full bg-[#4D6B53] transition-all"
                style={{
                  width: `${
                    totalPending + totalPaid > 0
                      ? Math.round(
                          (totalPaid / (totalPending + totalPaid)) * 100
                        )
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Chave PIX do Administrador em Destaque */}
        <div className="flex flex-col justify-between rounded-3xl bg-[#292524] p-7 text-[#FAF8F5] shadow-[0_16px_36px_-8px_rgba(28,25,23,0.16)] lg:col-span-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-[#A8A29E]">
                <Sparkles className="h-3.5 w-3.5 text-[#C26D53]" />
                Chave PIX para Acerto (Admin)
              </span>
              <span className="rounded-full border border-[#FAF8F5]/15 bg-[#FAF8F5]/10 px-3 py-1 text-[11px] font-medium text-[#E7E5E4]">
                Reembolso Direto
              </span>
            </div>

            <p className="mt-2 text-xs text-[#D6D3D1]">
              Copie a chave PIX oficial para transferir o saldo integral (
              {formatCurrency(totalPending)}) ou a parcela mensal (
              {formatCurrency(monthlyCommitment)}):
            </p>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#FAF8F5]/15 bg-[#1C1917] px-4 py-3.5">
              <code className="truncate text-sm font-medium text-[#FAF8F5]">
                {primaryPixKey}
              </code>
              <button
                type="button"
                onClick={() => handleCopyText(primaryPixKey, "primary-pix")}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#FAF8F5] px-4 py-2 text-xs font-semibold text-[#1C1917] transition-all hover:bg-[#E6E1DA]"
              >
                {copiedKey === "primary-pix" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#4D6B53]" />
                    Copiada!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar PIX
                  </>
                )}
              </button>
            </div>

            {/* Ação Direta: Avisar Admin que já fez o PIX de todas as cotas pendentes */}
            {totalPending > 0 && !isSimulatingOtherUser && (
              <div className="no-print mt-4">
                {!showBatchNoticeForm ? (
                  <button
                    type="button"
                    onClick={() => setShowBatchNoticeForm(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#C26D53]/50 bg-[#C26D53] px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#A85940]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Já fiz o PIX do Saldo Pendente (Avisar Admin)
                  </button>
                ) : (
                  <form
                    onSubmit={handleReportAllPending}
                    className="space-y-2.5 rounded-2xl border border-[#FAF8F5]/15 bg-[#1C1917] p-3.5"
                  >
                    <label className="block text-[11px] font-medium text-[#D6D3D1]">
                      Observação / Comprovante para o Admin:
                    </label>
                    <input
                      type="text"
                      value={batchNoteInput}
                      onChange={(e) => setBatchNoteInput(e.target.value)}
                      placeholder="Ex: PIX enviado hoje pelo Nubank / Itaú"
                      className="w-full rounded-xl border border-[#FAF8F5]/20 bg-[#292524] px-3 py-2 text-xs text-[#FAF8F5] placeholder-[#A8A29E] focus:outline-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBatchNoticeForm(false)}
                        className="rounded-lg px-3 py-1.5 text-xs text-[#A8A29E] hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isPendingTransition}
                        className="rounded-lg bg-[#4D6B53] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#364D3B] disabled:opacity-60"
                      >
                        {isPendingTransition
                          ? "Enviando..."
                          : "Confirmar Aviso ao Admin"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#A8A29E]">
            <span>Titular: {pixReceiverName}</span>
            <button
              type="button"
              onClick={() =>
                handleCopyText(
                  `Olá! Realizei o PIX de ${formatCurrency(
                    totalPending
                  )} referente aos meus itens pendentes da obra.`,
                  "msg-resumo"
                )
              }
              className="underline decoration-[#A8A29E]/50 underline-offset-4 hover:text-white"
            >
              {copiedKey === "msg-resumo"
                ? "Mensagem copiada!"
                : "Copiar texto para comprovante WhatsApp"}
            </button>
          </div>
        </div>
      </section>

      {/* Listagem Detalhada de Itens Atribuídos */}
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#1C1917]">
              Seus Itens por Nota Fiscal
            </h2>
            <p className="text-xs text-[#78716C]">
              Transparência total: veja a nota mãe, fornecedor, quantidade de parcelas e o valor exato da sua cota em cada material.
            </p>
          </div>

          {/* Filtros de Status e Etapa */}
          <div className="no-print flex flex-wrap items-center gap-3">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="rounded-2xl border border-[#E6E1DA] bg-white px-4 py-2.5 text-xs font-medium text-[#1C1917] focus:outline-none"
            >
              <option value="ALL">
                Todas as Etapas ({stagesInSplits.length})
              </option>
              {stagesInSplits.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-2xl border border-[#E6E1DA] bg-[#F3EFEA] p-1">
              {(
                [
                  { id: "ALL", label: `Todos (${splits.length})` },
                  { id: "PENDING", label: `Pendentes (${pendingCount})` },
                  { id: "PAID", label: `Pagos (${paidCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                    filter === tab.id
                      ? "bg-white text-[#1C1917] shadow-2xs"
                      : "text-[#78716C] hover:text-[#1C1917]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredSplits.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E6E1DA] bg-white/70 p-12 text-center">
            <p className="text-sm font-medium text-[#1C1917]">
              Nenhum item encontrado para este filtro.
            </p>
            <p className="mt-1 text-xs text-[#78716C]">
              Quando novos itens forem vinculados ao seu usuário, eles aparecerão listados aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSplits.map((split) => {
              const isPending = split.status === "PENDING";
              const isReportingThis = reportingSplitId === split.id;

              return (
                <article
                  key={split.id}
                  className="rounded-3xl border border-[#E6E1DA] bg-white p-6 transition-all hover:border-[#D6CFC5] md:p-7"
                >
                  <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                    {/* Bloco Esquerdo: Item + Dados da Nota Mãe */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            isPending
                              ? "bg-[#C26D53]/12 text-[#9A4B34]"
                              : "bg-[#4D6B53]/12 text-[#364D3B]"
                          }`}
                        >
                          {isPending ? "Pendente de Acerto" : "Pago / Quitado"}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full border border-[#E6E1DA] bg-[#FAF8F5] px-3 py-1 text-xs font-semibold text-[#1C1917]">
                          <FileText className="h-3 w-3 text-[#78716C]" />
                          {split.invoice.documentNumber} •{" "}
                          {split.invoice.supplier}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F3EFEA] px-3 py-1 text-xs text-[#78716C]">
                          <Layers className="h-3 w-3" />
                          {split.invoice.categoryName}
                        </span>

                        <span className="rounded-full bg-[#F3EFEA] px-3 py-1 text-xs text-[#78716C]">
                          Etapa: {split.item.stage}
                        </span>

                        <span className="inline-flex items-center gap-1 text-xs text-[#78716C]">
                          <Calendar className="h-3 w-3" />
                          {formatDateBR(split.invoice.date)}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-display text-lg font-semibold text-[#1C1917]">
                          {split.item.description}
                        </h3>
                        <p className="mt-0.5 text-xs text-[#78716C]">
                          Quantidade comprada:{" "}
                          <strong>
                            {split.item.quantity} {split.item.unit}
                          </strong>{" "}
                          • Valor total deste item na nota:{" "}
                          <strong>
                            {formatCurrency(split.item.totalItemValue)}
                          </strong>{" "}
                          • Modelo de Rateio:{" "}
                          <strong>{split.item.splitModel}</strong> • Pago na
                          loja por: <strong>{split.invoice.paidBy}</strong>
                        </p>
                      </div>

                      {split.invoice.observations && (
                        <p className="rounded-xl bg-[#FAF8F5] px-3.5 py-2 text-xs text-[#78716C]">
                          <strong className="font-medium text-[#1C1917]">
                            Observações da Nota Fiscal:
                          </strong>{" "}
                          {split.invoice.observations}
                        </p>
                      )}

                      {/* Badge acolhedor quando o participante já enviou aviso de PIX */}
                      {isPending && split.paymentNote && (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-[#B8860B]/30 bg-[#B8860B]/10 px-3.5 py-2 text-xs font-medium text-[#785502]">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-[#B8860B]" />
                          <span>
                            ⏳ Aviso enviado ao Admin:{" "}
                            <strong>{split.paymentNote}</strong> (Aguardando
                            confirmação)
                          </span>
                        </div>
                      )}

                      {!isPending && split.paidAt && (
                        <p className="text-xs font-medium text-[#4D6B53]">
                          ✓ Quitado em {formatDateBR(split.paidAt)}
                          {split.paymentNote ? ` (${split.paymentNote})` : ""}
                        </p>
                      )}
                    </div>

                    {/* Bloco Direito: Sua Cota + Parcelamento da Nota Mãe + Botões PIX */}
                    <div className="flex flex-col justify-between gap-4 border-t border-[#E6E1DA]/80 pt-4 sm:flex-row sm:items-center lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
                      <div className="space-y-1 sm:text-right">
                        <span className="block text-[11px] font-medium uppercase tracking-wider text-[#78716C]">
                          Sua Cota neste Item
                        </span>
                        <span className="block font-display text-2xl font-semibold text-[#1C1917]">
                          {formatCurrency(split.amountDue)}
                        </span>

                        {split.invoice.installments > 1 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#FAF8F5] px-2.5 py-1 text-xs font-medium text-[#78716C]">
                            <CreditCard className="h-3 w-3 text-[#C26D53]" />
                            Nota em {split.invoice.installments}x (≈{" "}
                            {formatCurrency(split.installmentValue)}/parcela)
                          </span>
                        ) : (
                          <span className="inline-block text-xs text-[#78716C]">
                            Nota paga à vista (1x)
                          </span>
                        )}
                      </div>

                      {isPending && (
                        <div className="no-print flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(split.invoice.pixKey, split.id)
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#292524] bg-white px-4 py-2.5 text-xs font-semibold text-[#1C1917] transition-colors hover:bg-[#292524] hover:text-[#FAF8F5]"
                          >
                            {copiedKey === split.id ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                PIX Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Copiar PIX da Nota
                              </>
                            )}
                          </button>

                          {!isSimulatingOtherUser && (
                            <button
                              type="button"
                              onClick={() => {
                                setReportingSplitId(
                                  isReportingThis ? null : split.id
                                );
                                setSplitNoteInput("");
                              }}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FAF8F5] px-4 py-2 text-xs font-semibold text-[#C26D53] transition-colors hover:bg-[#C26D53]/15"
                            >
                              <Send className="h-3 w-3" />
                              Informar Pagamento PIX
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Formulário inline rápido para informar o pagamento PIX desta cota */}
                  {isPending && isReportingThis && !isSimulatingOtherUser && (
                    <div className="no-print mt-4 flex flex-col gap-2.5 border-t border-[#E6E1DA] pt-4 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={splitNoteInput}
                        onChange={(e) => setSplitNoteInput(e.target.value)}
                        placeholder="Observação opcional (ex: PIX feito pelo Nubank às 14h)"
                        className="flex-1 rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2 text-xs text-[#1C1917] focus:border-[#292524] focus:bg-white focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isPendingTransition}
                          onClick={() =>
                            handleReportSingleSplit(split.id, split.amountDue)
                          }
                          className="rounded-xl bg-[#292524] px-4 py-2 text-xs font-semibold text-[#FAF8F5] hover:bg-[#1C1917] disabled:opacity-60"
                        >
                          {isPendingTransition
                            ? "Enviando..."
                            : "Enviar Aviso ao Admin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportingSplitId(null)}
                          className="rounded-xl px-3 py-2 text-xs text-[#78716C] hover:text-[#1C1917]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
