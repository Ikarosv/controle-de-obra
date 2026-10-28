// src/components/admin/invoice-master-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FilePlus2,
  Wand2,
} from "lucide-react";
import {
  createInvoiceSchema,
  type CreateInvoiceFormValues,
} from "@/lib/validations/invoice";
import { STAGES, UNITS, SPLIT_PRESETS, DEFAULT_PIX_KEY } from "@/lib/constants";
import { createInvoiceAction } from "@/actions/invoice-actions";
import { formatCurrency } from "@/lib/formatters";
import {
  calculatePresetSplits,
  calculateSplitsDifferenceInCents,
  isSplitSumExact,
  toCents,
  fromCents,
} from "@/lib/split-calculator";

interface InvoiceMasterFormProps {
  categories: { id: string; name: string }[];
  users: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "PARTICIPANT";
    avatarColor: string;
  }[];
  defaultPixKey?: string;
  onSuccess?: () => void;
}

export function InvoiceMasterForm({
  categories,
  users,
  defaultPixKey,
  onSuccess,
}: InvoiceMasterFormProps) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const defaultCategoryId = categories[0]?.id || "";
  const adminUser = users.find((u) => u.role === "ADMIN") || users[0];
  const resolvedPixKey = defaultPixKey?.trim() || DEFAULT_PIX_KEY;

  const participantInputs = users.map((u) => ({
    userId: u.id,
    role: u.role,
  }));

  const buildPresetSplits = (
    totalVal: number,
    preset = "50/50",
    targetUserIdFor100?: string
  ) => {
    return calculatePresetSplits(
      Number(totalVal) || 0,
      participantInputs,
      preset,
      targetUserIdFor100
    );
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      documentNumber: "",
      supplier: "",
      date: today,
      categoryId: defaultCategoryId,
      installments: 1,
      pixKey: resolvedPixKey,
      paidBy: adminUser?.name || "Administrador",
      observations: "",
      items: [
        {
          description: "",
          unit: "un",
          quantity: 1,
          totalValue: 0,
          stage: STAGES[1],
          splitModel: "50/50",
          splits: buildPresetSplits(0, "50/50"),
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const watchedInstallments = watch("installments") || 1;

  const grandTotal = fromCents(
    (watchedItems || []).reduce(
      (acc, item) => acc + toCents(Number(item?.totalValue) || 0),
      0
    )
  );

  // Recalcula automaticamente o rateio de um item específico quando valor ou preset mudam
  const recalculateItemSplit = (
    itemIndex: number,
    newTotal: number,
    preset: string
  ) => {
    if (preset === "CUSTOM") return;
    const updatedSplits = buildPresetSplits(Number(newTotal) || 0, preset);
    setValue(`items.${itemIndex}.splits`, updatedSplits, {
      shouldValidate: true,
    });
  };

  const handleAssign100PercentToUser = (
    itemIndex: number,
    targetUserId: string
  ) => {
    const itemTotal = Number(watchedItems?.[itemIndex]?.totalValue) || 0;
    setValue(`items.${itemIndex}.splitModel`, "100/0");
    const updated = buildPresetSplits(itemTotal, "100/0", targetUserId);
    setValue(`items.${itemIndex}.splits`, updated, { shouldValidate: true });
  };

  // Ajusta automaticamente a diferença de centavos na primeira cota ativa (modo CUSTOM)
  const handleAdjustDifference = (itemIndex: number) => {
    const currentItem = watchedItems?.[itemIndex];
    if (!currentItem) return;

    const itemTotal = Number(currentItem.totalValue) || 0;
    const currentSplits = currentItem.splits || [];
    const diffCents = calculateSplitsDifferenceInCents(
      itemTotal,
      currentSplits.map((s) => ({ amountDue: Number(s?.amountDue) || 0 }))
    );

    if (diffCents === 0) return;

    // Procura a primeira cota ativa (> 0) que suporte o ajuste sem ficar negativa
    let targetIdx = currentSplits.findIndex(
      (s) =>
        toCents(Number(s?.amountDue) || 0) > 0 &&
        toCents(Number(s?.amountDue) || 0) + diffCents >= 0
    );

    // Se nenhuma cota ativa suportar, procura qualquer cota que suporte o ajuste
    if (targetIdx === -1) {
      targetIdx = currentSplits.findIndex(
        (s) => toCents(Number(s?.amountDue) || 0) + diffCents >= 0
      );
    }

    if (targetIdx === -1) return;

    const updatedSplits = currentSplits.map((s, idx) => {
      const currentCents = toCents(Number(s?.amountDue) || 0);
      if (idx === targetIdx) {
        return {
          ...s,
          amountDue: fromCents(currentCents + diffCents),
        };
      }
      return {
        ...s,
        amountDue: fromCents(currentCents),
      };
    });

    setValue(`items.${itemIndex}.splitModel`, "CUSTOM");
    setValue(`items.${itemIndex}.splits`, updatedSplits, {
      shouldValidate: true,
    });
  };

  const onSubmit = (values: CreateInvoiceFormValues) => {
    setToast(null);
    startTransition(async () => {
      const res = await createInvoiceAction(values);
      if (res.success) {
        setToast({ type: "success", text: res.message });
        reset({
          documentNumber: "",
          supplier: "",
          date: today,
          categoryId: values.categoryId,
          installments: 1,
          pixKey: values.pixKey || resolvedPixKey,
          paidBy: values.paidBy,
          observations: "",
          items: [
            {
              description: "",
              unit: "un",
              quantity: 1,
              totalValue: 0,
              stage: STAGES[1],
              splitModel: "50/50",
              splits: buildPresetSplits(0, "50/50"),
            },
          ],
        });
        if (onSuccess) onSuccess();
      } else {
        setToast({ type: "error", text: res.message });
      }
    });
  };

  const inputClass =
    "w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917] placeholder-[#A8A29E] transition-colors focus:border-[#292524] focus:bg-white focus:outline-none";
  const labelClass =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#78716C]";
  const errorClass = "mt-1 text-xs font-medium text-[#C26D53]";

  return (
    <section className="rounded-3xl border border-[#E6E1DA] bg-white p-6 shadow-[0_12px_32px_-8px_rgba(28,25,23,0.04)] md:p-9">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#E6E1DA] pb-6 md:flex-row md:items-center">
        <div>
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#C26D53]">
            <FilePlus2 className="h-3.5 w-3.5" />
            Lançamento Mestre-Detalhe (Admin)
          </span>
          <h2 className="mt-1 font-display text-2xl font-semibold text-[#1C1917]">
            Registrar Nota Fiscal & Rateio por Item
          </h2>
          <p className="mt-0.5 text-xs text-[#78716C]">
            Cadastre a nota mãe, adicione os materiais comprados e defina quem paga cada item individualmente com precisão exata de centavos.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E6E1DA] bg-[#FAF8F5] px-5 py-3 text-right">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#78716C]">
            Total Calculado da Nota ({fields.length}{" "}
            {fields.length === 1 ? "item" : "itens"})
          </span>
          <span className="font-display text-2xl font-semibold text-[#1C1917]">
            {formatCurrency(grandTotal)}
          </span>
          {watchedInstallments > 1 && grandTotal > 0 && (
            <span className="block text-[11px] text-[#78716C]">
              {watchedInstallments}x de{" "}
              {formatCurrency(grandTotal / watchedInstallments)}
            </span>
          )}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className={`mb-7 flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-medium ${
            toast.type === "success"
              ? "border-[#4D6B53]/30 bg-[#4D6B53]/10 text-[#364D3B]"
              : "border-[#C26D53]/30 bg-[#C26D53]/10 text-[#9A4B34]"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#4D6B53]" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-[#C26D53]" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
        {/* BLOCO 1: Dados da Nota Fiscal Mãe */}
        <div className="rounded-2xl border border-[#E6E1DA] bg-[#FAF8F5]/60 p-5 md:p-6">
          <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-[#1C1917]">
            1. Dados da Nota Fiscal (Entidade Pai)
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-3">
              <label htmlFor="documentNumber" className={labelClass}>
                Nº Documento / NF
              </label>
              <input
                id="documentNumber"
                type="text"
                placeholder="Ex: NF-014520"
                className={`${inputClass} bg-white`}
                {...register("documentNumber")}
              />
              {errors.documentNumber && (
                <p className={errorClass}>{errors.documentNumber.message}</p>
              )}
            </div>

            <div className="md:col-span-4">
              <label htmlFor="supplier" className={labelClass}>
                Fornecedor / Loja
              </label>
              <input
                id="supplier"
                type="text"
                placeholder="Ex: Obramax / Leroy Merlin"
                className={`${inputClass} bg-white`}
                {...register("supplier")}
              />
              {errors.supplier && (
                <p className={errorClass}>{errors.supplier.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="date" className={labelClass}>
                Data da Compra
              </label>
              <input
                id="date"
                type="date"
                className={`${inputClass} bg-white`}
                {...register("date")}
              />
              {errors.date && (
                <p className={errorClass}>{errors.date.message}</p>
              )}
            </div>

            <div className="md:col-span-3">
              <label htmlFor="categoryId" className={labelClass}>
                Categoria Geral da Nota
              </label>
              <select
                id="categoryId"
                className={`${inputClass} bg-white`}
                {...register("categoryId")}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className={errorClass}>{errors.categoryId.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="installments" className={labelClass}>
                Parcelas (x)
              </label>
              <input
                id="installments"
                type="number"
                min={1}
                max={120}
                className={`${inputClass} bg-white`}
                {...register("installments")}
              />
              {errors.installments && (
                <p className={errorClass}>{errors.installments.message}</p>
              )}
            </div>

            <div className="md:col-span-4">
              <label htmlFor="paidBy" className={labelClass}>
                Quem Pagou a Loja?
              </label>
              <select
                id="paidBy"
                className={`${inputClass} bg-white`}
                {...register("paidBy")}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
                <option value="Conta Conjunta da Obra">
                  Conta Conjunta da Obra
                </option>
              </select>
            </div>

            <div className="md:col-span-6">
              <label htmlFor="pixKey" className={labelClass}>
                Chave PIX Oficial para Recebimento (Exibida aos Participantes)
              </label>
              <input
                id="pixKey"
                type="text"
                placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                className={`${inputClass} bg-white`}
                {...register("pixKey")}
              />
              {errors.pixKey && (
                <p className={errorClass}>{errors.pixKey.message}</p>
              )}
            </div>

            <div className="md:col-span-12">
              <label htmlFor="observations" className={labelClass}>
                Observações / Condições de Entrega ou Pagamento (Opcional)
              </label>
              <input
                id="observations"
                type="text"
                placeholder="Ex: Parcelado em 4x sem juros no cartão. Entrega agendada para sexta-feira."
                className={`${inputClass} bg-white`}
                {...register("observations")}
              />
            </div>
          </div>
        </div>

        {/* BLOCO 2: Lista Dinâmica de Itens da Nota + Rateio por Usuário */}
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-[#1C1917]">
                2. Itens da Nota Fiscal & Vínculo de Pagadores
              </h3>
              <p className="text-xs text-[#78716C]">
                Adicione quantos itens houver na nota e distribua as cotas entre os usuários cadastrados (soma exata ao centavo).
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                append({
                  description: "",
                  unit: "un",
                  quantity: 1,
                  totalValue: 0,
                  stage: STAGES[1],
                  splitModel: "50/50",
                  splits: buildPresetSplits(0, "50/50"),
                })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#292524] px-4 py-2.5 text-xs font-semibold text-[#FAF8F5] transition-colors hover:bg-[#1C1917]"
            >
              <Plus className="h-4 w-4" />
              Adicionar Outro Item na Nota
            </button>
          </div>

          <div className="space-y-6">
            {fields.map((field, index) => {
              const currentItem = watchedItems?.[index];
              const itemTotal = Number(currentItem?.totalValue) || 0;
              const currentSplits = currentItem?.splits || [];
              const normalizedSplits = currentSplits.map((s) => ({
                amountDue: Number(s?.amountDue) || 0,
              }));

              const sumSplits = fromCents(
                normalizedSplits.reduce(
                  (acc, s) => acc + toCents(s.amountDue),
                  0
                )
              );
              const diffCents = calculateSplitsDifferenceInCents(
                itemTotal,
                normalizedSplits
              );
              const diff = fromCents(diffCents);
              const isBalanced = isSplitSumExact(itemTotal, normalizedSplits);

              return (
                <div
                  key={field.id}
                  className="rounded-3xl border border-[#E6E1DA] bg-white p-5 shadow-2xs transition-all hover:border-[#D6CFC5] md:p-6"
                >
                  <div className="mb-4 flex items-center justify-between border-b border-[#E6E1DA]/70 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#292524] text-xs font-semibold text-[#FAF8F5]">
                        {index + 1}
                      </span>
                      <span className="font-display text-sm font-semibold text-[#1C1917]">
                        Item #{index + 1} da Nota
                      </span>
                    </div>

                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[#C26D53] transition-colors hover:bg-[#C26D53]/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover Item
                      </button>
                    )}
                  </div>

                  {/* Campos do Item */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                    <div className="md:col-span-4">
                      <label className={labelClass}>
                        Descrição do Material / Serviço
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Cimento CP-II 50kg / Porcelanato"
                        className={inputClass}
                        {...register(`items.${index}.description`)}
                      />
                      {errors.items?.[index]?.description && (
                        <p className={errorClass}>
                          {errors.items[index]?.description?.message}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-3">
                      <label className={labelClass}>Etapa da Obra</label>
                      <select
                        className={inputClass}
                        {...register(`items.${index}.stage`)}
                      >
                        {STAGES.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <label className={labelClass}>Unid.</label>
                      <select
                        className={inputClass}
                        {...register(`items.${index}.unit`)}
                      >
                        {UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className={labelClass}>Quantidade</label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputClass}
                        {...register(`items.${index}.quantity`)}
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className={errorClass}>
                          {errors.items[index]?.quantity?.message}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className={labelClass}>Valor Total Item (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className={inputClass}
                        {...register(`items.${index}.totalValue`, {
                          onChange: (e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const currentModel =
                              watchedItems?.[index]?.splitModel || "50/50";
                            recalculateItemSplit(index, val, currentModel);
                          },
                        })}
                      />
                      {errors.items?.[index]?.totalValue && (
                        <p className={errorClass}>
                          {errors.items[index]?.totalValue?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sub-bloco: Vínculo de Pagadores (ItemSplit) */}
                  <div className="mt-5 rounded-2xl border border-[#E6E1DA] bg-[#FAF8F5] p-4 md:p-5">
                    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#1C1917]">
                          <Calculator className="h-3.5 w-3.5 text-[#C26D53]" />
                          Rateio deste Item entre Usuários:
                        </span>

                        <select
                          className="rounded-xl border border-[#E6E1DA] bg-white px-3 py-1.5 text-xs font-semibold text-[#1C1917] focus:outline-none"
                          {...register(`items.${index}.splitModel`, {
                            onChange: (e) => {
                              recalculateItemSplit(
                                index,
                                itemTotal,
                                e.target.value
                              );
                            },
                          })}
                        >
                          {SPLIT_PRESETS.map((preset) => (
                            <option key={preset.value} value={preset.value}>
                              {preset.label}
                            </option>
                          ))}
                        </select>

                        {/* Botões rápidos 100% para um usuário específico */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {users.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() =>
                                handleAssign100PercentToUser(index, u.id)
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E6E1DA] bg-white px-2.5 py-1 text-[11px] font-medium text-[#78716C] transition-colors hover:border-[#292524] hover:text-[#1C1917]"
                            >
                              <Sparkles className="h-2.5 w-2.5 text-[#C26D53]" />
                              100% {u.name.split(" ")[0]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Validador Visual de Soma das Cotas (Tolerância Zero: diffCents === 0) */}
                      <div className="flex flex-wrap items-center justify-end gap-2 text-right text-xs">
                        {toCents(itemTotal) > 0 ? (
                          isBalanced ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#4D6B53]/12 px-3 py-1 font-semibold text-[#364D3B]">
                              ✓ Soma fechada: {formatCurrency(sumSplits)}
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#C26D53]/15 px-3 py-1 font-semibold text-[#9A4B34]">
                                Diferença de{" "}
                                {diff > 0
                                  ? `+${formatCurrency(diff)}`
                                  : formatCurrency(diff)}{" "}
                                (Soma: {formatCurrency(sumSplits)})
                              </span>
                              {diffCents !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleAdjustDifference(index)}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#B8860B]/40 bg-[#B8860B]/15 px-3 py-1 text-[11px] font-semibold text-[#785502] transition-colors hover:bg-[#B8860B]/25"
                                  title="Ajusta automaticamente a diferença na primeira cota ativa para fechar os centavos exatos"
                                >
                                  <Wand2 className="h-3 w-3" />
                                  Ajustar Diferença (
                                  {diff > 0
                                    ? `+${formatCurrency(diff)}`
                                    : formatCurrency(diff)}
                                  )
                                </button>
                              )}
                            </>
                          )
                        ) : (
                          <span className="text-[#78716C]">
                            Informe o valor do item para calcular as cotas
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Grid com cada Usuário Cadastrado no Banco */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {users.map((user, uIdx) => {
                        const userAmount =
                          Number(currentSplits?.[uIdx]?.amountDue) || 0;
                        const percent =
                          itemTotal > 0
                            ? Math.round((userAmount / itemTotal) * 100)
                            : 0;

                        return (
                          <div
                            key={user.id}
                            className={`rounded-2xl border p-3.5 transition-all ${
                              userAmount > 0
                                ? "border-[#292524]/25 bg-white shadow-2xs"
                                : "border-[#E6E1DA] bg-[#F3EFEA]/50 opacity-75"
                            }`}
                          >
                            <input
                              type="hidden"
                              value={user.id}
                              {...register(
                                `items.${index}.splits.${uIdx}.userId`
                              )}
                            />

                            <div className="mb-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                                  style={{ backgroundColor: user.avatarColor }}
                                >
                                  {user.name.charAt(0)}
                                </span>
                                <div>
                                  <p className="text-xs font-semibold text-[#1C1917]">
                                    {user.name}
                                  </p>
                                  <p className="text-[10px] text-[#78716C]">
                                    {user.role === "ADMIN"
                                      ? "Administrador"
                                      : "Participante"}
                                  </p>
                                </div>
                              </div>
                              <span className="rounded-md bg-[#FAF8F5] px-2 py-0.5 text-[11px] font-semibold text-[#78716C]">
                                {percent}%
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="mb-1 block text-[10px] font-medium uppercase text-[#78716C]">
                                  Cota (R$)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#1C1917] focus:border-[#292524] focus:bg-white focus:outline-none"
                                  {...register(
                                    `items.${index}.splits.${uIdx}.amountDue`,
                                    {
                                      onChange: () => {
                                        setValue(
                                          `items.${index}.splitModel`,
                                          "CUSTOM"
                                        );
                                      },
                                    }
                                  )}
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-[10px] font-medium uppercase text-[#78716C]">
                                  Status Inicial
                                </label>
                                <select
                                  className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-2.5 py-2 text-xs font-medium text-[#1C1917] focus:border-[#292524] focus:bg-white focus:outline-none"
                                  {...register(
                                    `items.${index}.splits.${uIdx}.status`
                                  )}
                                >
                                  <option value="PENDING">Pendente</option>
                                  <option value="PAID">Já Pago</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {errors.items?.[index]?.splits && (
                      <p className="mt-2 text-xs font-semibold text-[#C26D53]">
                        {errors.items[index]?.splits?.message ||
                          errors.items[index]?.splits?.root?.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé do Formulário */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#E6E1DA] pt-6 sm:flex-row">
          <p className="text-xs text-[#78716C]">
            Ao salvar, os participantes vinculados verão imediatamente suas cotas e o seu PIX no painel deles.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              disabled={isPending}
              className="rounded-xl px-5 py-3 text-xs font-semibold text-[#78716C] transition-colors hover:bg-[#F3EFEA] hover:text-[#1C1917]"
            >
              Limpar Formulário
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-[#292524] px-7 py-3.5 text-xs font-semibold text-[#FAF8F5] shadow-sm transition-all hover:bg-[#1C1917] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? "Validando e Salvando Nota..."
                : "Salvar Nota Fiscal & Rateios"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
