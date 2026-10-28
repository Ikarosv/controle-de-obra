// src/actions/invoice-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { auth, signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import {
  createInvoiceSchema,
  createUserSchema,
  createCategorySchema,
  updateStageBudgetSchema,
  updateProjectSettingsSchema,
  changeOwnPasswordSchema,
  adminResetPasswordSchema,
  deleteUserSchema,
  reportPaymentNoticeSchema,
  reportAllPendingNoticeSchema,
  type CreateInvoiceFormValues,
} from "@/lib/validations/invoice";
import {
  readLocalStore,
  writeLocalStore,
  DEFAULT_PROJECT_SETTINGS,
  type Role,
} from "@/lib/db";
import { toCents, fromCents } from "@/lib/split-calculator";

export type ActionResponse = {
  success: boolean;
  message: string;
};

export interface SessionActor {
  id: string;
  role: Role;
  name?: string | null;
  email?: string | null;
}

async function requireAuth(): Promise<SessionActor> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sessão expirada ou usuário não autenticado.");
  }
  return {
    id: session.user.id,
    role: (session.user.role as Role) || "PARTICIPANT",
    name: session.user.name,
    email: session.user.email,
  };
}

async function requireAdmin(): Promise<SessionActor> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Acesso restrito ao Administrador da Obra.");
  }
  return user;
}

/**
 * Resolve o ator autenticado garantindo que `_testActor` jamais possa ser
 * injetado via requisição HTTP de cliente em Server Actions, sendo aceito
 * exclusivamente quando a flag de processo `ALLOW_QA_TEST_ACTOR === "true"`
 * estiver ativa fora de produção (suíte CLI de QA).
 */
async function resolveAuthActor(_testActor?: SessionActor): Promise<SessionActor> {
  if (
    _testActor &&
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_QA_TEST_ACTOR === "true"
  ) {
    return _testActor;
  }
  return requireAuth();
}

async function resolveAdminActor(_testActor?: SessionActor): Promise<SessionActor> {
  const actor = await resolveAuthActor(_testActor);
  if (actor.role !== "ADMIN") {
    throw new Error("Acesso restrito ao Administrador da Obra.");
  }
  return actor;
}

function safeRevalidate(paths: string[]) {
  try {
    for (const p of paths) {
      revalidatePath(p);
    }
  } catch {
    // Ignorado quando executado fora do contexto de request HTTP do Next.js (ex: testes automatizados QA)
  }
}

export async function authenticateAction(
  email: string,
  password: string
): Promise<ActionResponse & { redirectUrl?: string }> {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    const store = readLocalStore();
    const user = store.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    const redirectUrl = user?.role === "ADMIN" ? "/admin" : "/meu-painel";

    return {
      success: true,
      message: "Login realizado com sucesso!",
      redirectUrl,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        message: "Credenciais inválidas. Verifique seu e-mail e senha.",
      };
    }
    return {
      success: false,
      message: "Não foi possível realizar o login. Verifique suas credenciais.",
    };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createInvoiceAction(
  rawInput: CreateInvoiceFormValues
): Promise<ActionResponse> {
  try {
    await requireAdmin();

    const parsed = createInvoiceSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        message:
          firstIssue?.message || "Verifique os dados informados no formulário.",
      };
    }

    const data = parsed.data;
    const store = readLocalStore();

    const invoiceId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    store.invoices.push({
      id: invoiceId,
      documentNumber: data.documentNumber,
      supplier: data.supplier,
      date: data.date.includes("T") ? data.date : `${data.date}T12:00:00.000Z`,
      categoryId: data.categoryId,
      installments: data.installments,
      pixKey: data.pixKey,
      paidBy: data.paidBy,
      observations: data.observations || null,
      createdAt: nowIso,
    });

    for (const item of data.items) {
      const itemId = crypto.randomUUID();
      store.invoiceItems.push({
        id: itemId,
        invoiceId,
        description: item.description,
        unit: item.unit || "un",
        quantity: Number(item.quantity),
        totalValue: fromCents(toCents(item.totalValue)),
        stage: item.stage,
        splitModel: item.splitModel || "50/50",
      });

      const activeSplits = item.splits.filter((s) => toCents(s.amountDue) > 0);
      for (const split of activeSplits) {
        store.itemSplits.push({
          id: crypto.randomUUID(),
          invoiceItemId: itemId,
          userId: split.userId,
          amountDue: fromCents(toCents(split.amountDue)),
          status: split.status,
          paidAt: split.status === "PAID" ? nowIso : null,
          paymentNote:
            split.status === "PAID" ? "Quitado no momento do lançamento" : null,
        });
      }
    }

    writeLocalStore(store);

    safeRevalidate(["/admin", "/meu-painel"]);

    return {
      success: true,
      message: `Nota Fiscal ${data.documentNumber} (${data.items.length} ${
        data.items.length === 1 ? "item" : "itens"
      }) registrada com sucesso!`,
    };
  } catch (error) {
    console.error("[createInvoiceAction Error]:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro ao registrar a Nota Fiscal.",
    };
  }
}

export async function toggleSplitStatusAction(
  splitId: string,
  paymentNote?: string
): Promise<ActionResponse> {
  try {
    await requireAdmin();

    const store = readLocalStore();
    const split = store.itemSplits.find((s) => s.id === splitId);

    if (!split) {
      return { success: false, message: "Cota de rateio não encontrada." };
    }

    const nextStatus = split.status === "PENDING" ? "PAID" : "PENDING";
    split.status = nextStatus;
    split.paidAt = nextStatus === "PAID" ? new Date().toISOString() : null;
    split.paymentNote =
      nextStatus === "PAID"
        ? paymentNote || "Pagamento confirmado pelo Administrador"
        : null;

    writeLocalStore(store);

    safeRevalidate(["/admin", "/meu-painel"]);

    return {
      success: true,
      message:
        nextStatus === "PAID"
          ? "Cota marcada como PAGA com sucesso!"
          : "Cota retornada para status PENDENTE.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao atualizar status.",
    };
  }
}

export async function settleAllUserSplitsAction(
  userId: string
): Promise<ActionResponse> {
  try {
    await requireAdmin();

    const store = readLocalStore();
    const nowIso = new Date().toISOString();
    let count = 0;

    for (const split of store.itemSplits) {
      if (split.userId === userId && split.status === "PENDING") {
        split.status = "PAID";
        split.paidAt = nowIso;
        split.paymentNote = "Quitação em lote pelo Administrador";
        count++;
      }
    }

    if (count === 0) {
      return {
        success: false,
        message: "Este participante não possui cotas pendentes.",
      };
    }

    writeLocalStore(store);

    safeRevalidate(["/admin", "/meu-painel"]);

    return {
      success: true,
      message: `${count} ${
        count === 1 ? "cota foi quitada" : "cotas foram quitadas"
      } com sucesso!`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao quitar cotas.",
    };
  }
}

export async function deleteInvoiceAction(
  invoiceId: string
): Promise<ActionResponse> {
  try {
    await requireAdmin();

    const store = readLocalStore();
    const inv = store.invoices.find((i) => i.id === invoiceId);
    if (!inv) {
      return { success: false, message: "Nota fiscal não encontrada." };
    }

    const itemIds = new Set(
      store.invoiceItems
        .filter((item) => item.invoiceId === invoiceId)
        .map((item) => item.id)
    );

    store.itemSplits = store.itemSplits.filter(
      (s) => !itemIds.has(s.invoiceItemId)
    );
    store.invoiceItems = store.invoiceItems.filter(
      (item) => item.invoiceId !== invoiceId
    );
    store.invoices = store.invoices.filter((i) => i.id !== invoiceId);

    writeLocalStore(store);

    safeRevalidate(["/admin", "/meu-painel"]);

    return {
      success: true,
      message: `Nota ${inv.documentNumber} e seus rateios foram removidos.`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao remover nota fiscal.",
    };
  }
}

export async function createUserAction(rawInput: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "PARTICIPANT";
  phone?: string;
  avatarColor?: string;
}): Promise<ActionResponse> {
  try {
    await requireAdmin();

    const parsed = createUserSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Dados de usuário inválidos.",
      };
    }

    const data = parsed.data;
    const store = readLocalStore();

    const exists = store.users.some(
      (u) => u.email.toLowerCase() === data.email.toLowerCase()
    );
    if (exists) {
      return {
        success: false,
        message: "Já existe um usuário cadastrado com este e-mail.",
      };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    store.users.push({
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      avatarColor: data.avatarColor || "#C26D53",
      phone: data.phone || null,
      createdAt: new Date().toISOString(),
    });

    writeLocalStore(store);

    safeRevalidate(["/admin"]);

    return {
      success: true,
      message: `Usuário ${data.name} (${data.role}) cadastrado com sucesso!`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao criar participante.",
    };
  }
}

export async function createCategoryAction(rawInput: {
  name: string;
  description?: string;
  budgetLimit?: number;
}): Promise<ActionResponse> {
  try {
    await requireAdmin();

    const parsed = createCategorySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message:
          parsed.error.issues[0]?.message || "Nome de categoria inválido.",
      };
    }

    const store = readLocalStore();
    const exists = store.categories.some(
      (c) => c.name.toLowerCase() === parsed.data.name.toLowerCase()
    );
    if (exists) {
      return {
        success: false,
        message: "Esta categoria já está cadastrada.",
      };
    }

    store.categories.push({
      id: crypto.randomUUID(),
      name: parsed.data.name,
      description: parsed.data.description || null,
      budgetLimit: parsed.data.budgetLimit || null,
      createdAt: new Date().toISOString(),
    });

    writeLocalStore(store);
    safeRevalidate(["/admin"]);

    return {
      success: true,
      message: `Categoria "${parsed.data.name}" adicionada!`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao criar categoria.",
    };
  }
}

export async function updateStageBudgetAction(rawInput: {
  stage: string;
  budgetLimit: number;
}): Promise<ActionResponse> {
  try {
    await requireAdmin();

    const parsed = updateStageBudgetSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: "Valor de orçamento inválido.",
      };
    }

    const store = readLocalStore();
    const existing = store.stageBudgets.find(
      (b) => b.stage === parsed.data.stage
    );

    if (existing) {
      existing.budgetLimit = Number(parsed.data.budgetLimit);
    } else {
      store.stageBudgets.push({
        id: crypto.randomUUID(),
        stage: parsed.data.stage,
        budgetLimit: Number(parsed.data.budgetLimit),
        orderIndex: store.stageBudgets.length,
      });
    }

    writeLocalStore(store);
    safeRevalidate(["/admin"]);

    return {
      success: true,
      message: `Meta da etapa "${parsed.data.stage}" atualizada!`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao atualizar meta.",
    };
  }
}

// ============================================================================
// NOVAS SERVER ACTIONS (ETAPA 2): CONFIGURAÇÕES DA OBRA, SENHAS, ANTI-IDOR PIX
// ============================================================================

export async function updateProjectSettingsAction(
  rawInput: {
    projectName: string;
    officialPixKey: string;
    pixReceiverName: string;
    applyToPendingInvoices?: boolean;
    updatePendingInvoicesPix?: boolean;
  },
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    const actor = await resolveAdminActor(_testActor);
    if (actor.role !== "ADMIN") {
      return {
        success: false,
        message: "Acesso restrito ao Administrador da Obra.",
      };
    }

    const parsed = updateProjectSettingsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message:
          parsed.error.issues[0]?.message ||
          "Dados de configuração da obra inválidos.",
      };
    }

    const data = parsed.data;
    const shouldApplyToPending = Boolean(
      data.applyToPendingInvoices ?? data.updatePendingInvoicesPix
    );

    const store = readLocalStore();
    const nowIso = new Date().toISOString();

    const updatedSettings = {
      id: store.projectSettings?.id || DEFAULT_PROJECT_SETTINGS.id,
      projectName: data.projectName,
      officialPixKey: data.officialPixKey,
      pixReceiverName: data.pixReceiverName,
      updatedAt: nowIso,
    };

    store.projectSettings = updatedSettings;
    store.settings = updatedSettings;

    let updatedInvoicesCount = 0;
    if (shouldApplyToPending) {
      const pendingItemIds = new Set(
        store.itemSplits
          .filter((s) => s.status === "PENDING")
          .map((s) => s.invoiceItemId)
      );
      const pendingInvoiceIds = new Set(
        store.invoiceItems
          .filter((item) => pendingItemIds.has(item.id))
          .map((item) => item.invoiceId)
      );

      for (const inv of store.invoices) {
        if (pendingInvoiceIds.has(inv.id)) {
          inv.pixKey = data.officialPixKey;
          updatedInvoicesCount++;
        }
      }
    }

    writeLocalStore(store);
    safeRevalidate(["/admin", "/meu-painel"]);

    return {
      success: true,
      message:
        shouldApplyToPending && updatedInvoicesCount > 0
          ? `Configurações da obra salvas e chave PIX atualizada em ${updatedInvoicesCount} ${
              updatedInvoicesCount === 1 ? "nota pendente" : "notas pendentes"
            }!`
          : "Configurações oficiais da obra e chave PIX atualizadas com sucesso!",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar configurações da obra.",
    };
  }
}

export async function changeOwnPasswordAction(
  rawInput: {
    currentPassword: string;
    newPassword: string;
  },
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    const actor = await resolveAuthActor(_testActor);

    const parsed = changeOwnPasswordSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message:
          parsed.error.issues[0]?.message || "Dados de senha inválidos.",
      };
    }

    const store = readLocalStore();
    // Anti-IDOR: busca estritamente pelo ID do usuário autenticado na sessão
    const user = store.users.find((u) => u.id === actor.id);
    if (!user) {
      return {
        success: false,
        message: "Usuário autenticado não encontrado.",
      };
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      return {
        success: false,
        message: "A senha atual informada está incorreta.",
      };
    }

    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    writeLocalStore(store);

    safeRevalidate(["/admin", "/meu-painel"]);

    return {
      success: true,
      message: "Sua senha foi alterada com sucesso!",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro ao alterar a própria senha.",
    };
  }
}

export async function adminResetUserPasswordAction(
  rawInput: {
    targetUserId: string;
    newPassword: string;
  },
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    const actor = await resolveAdminActor(_testActor);
    if (actor.role !== "ADMIN") {
      return {
        success: false,
        message: "Acesso restrito ao Administrador da Obra.",
      };
    }

    const parsed = adminResetPasswordSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message:
          parsed.error.issues[0]?.message ||
          "Dados para redefinição de senha inválidos.",
      };
    }

    const store = readLocalStore();
    const targetUser = store.users.find(
      (u) => u.id === parsed.data.targetUserId
    );
    if (!targetUser) {
      return {
        success: false,
        message: "Participante não encontrado.",
      };
    }

    targetUser.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    writeLocalStore(store);

    safeRevalidate(["/admin"]);

    return {
      success: true,
      message: `Senha de ${targetUser.name} redefinida com sucesso!`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro ao redefinir a senha do participante.",
    };
  }
}

export async function deleteUserAction(
  rawInputOrUserId: string | { targetUserId: string },
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    const actor = await resolveAdminActor(_testActor);
    if (actor.role !== "ADMIN") {
      return {
        success: false,
        message: "Acesso restrito ao Administrador da Obra.",
      };
    }

    const normalizedInput =
      typeof rawInputOrUserId === "string"
        ? { targetUserId: rawInputOrUserId }
        : rawInputOrUserId;

    const parsed = deleteUserSchema.safeParse(normalizedInput);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Usuário inválido.",
      };
    }

    const { targetUserId } = parsed.data;

    if (targetUserId === actor.id) {
      return {
        success: false,
        message: "Você não pode remover sua própria conta de Administrador.",
      };
    }

    const store = readLocalStore();
    const targetUser = store.users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return {
        success: false,
        message: "Participante não encontrado.",
      };
    }

    const splitsCount = store.itemSplits.filter(
      (s) => s.userId === targetUserId
    ).length;

    if (splitsCount > 0) {
      return {
        success: false,
        message:
          "Não é possível remover um participante que já possui cotas vinculadas em notas fiscais.",
      };
    }

    store.users = store.users.filter((u) => u.id !== targetUserId);
    writeLocalStore(store);

    safeRevalidate(["/admin"]);

    return {
      success: true,
      message: `Participante ${targetUser.name} removido com sucesso.`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro ao remover participante.",
    };
  }
}

export async function reportSplitPaymentNoticeAction(
  rawInput: {
    splitId: string;
    note: string;
  },
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    const actor = await resolveAuthActor(_testActor);

    const parsed = reportPaymentNoticeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message:
          parsed.error.issues[0]?.message ||
          "Informe uma observação válida sobre o PIX.",
      };
    }

    const store = readLocalStore();
    const split = store.itemSplits.find((s) => s.id === parsed.data.splitId);
    if (!split) {
      return {
        success: false,
        message: "Cota de rateio não encontrada.",
      };
    }

    // Blindagem Anti-IDOR estrita: o usuário autenticado deve ser dono estrito da cota
    if (split.userId !== actor.id) {
      return {
        success: false,
        message:
          "Acesso negado: você só pode informar pagamentos das suas próprias cotas.",
      };
    }

    if (split.status === "PAID") {
      return {
        success: false,
        message: "Esta cota já consta como quitada.",
      };
    }

    split.paymentNote = `PIX informado: ${parsed.data.note}`;
    writeLocalStore(store);

    safeRevalidate(["/meu-painel", "/admin"]);

    return {
      success: true,
      message:
        "Aviso de PIX enviado ao Administrador! A cota será baixada após a conferência.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro ao enviar aviso de pagamento PIX.",
    };
  }
}

export async function reportAllPendingSplitsNoticeAction(
  rawInputOrNote: string | { note: string },
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    const actor = await resolveAuthActor(_testActor);

    const normalizedInput =
      typeof rawInputOrNote === "string"
        ? { note: rawInputOrNote }
        : rawInputOrNote;

    const parsed = reportAllPendingNoticeSchema.safeParse(normalizedInput);
    if (!parsed.success) {
      return {
        success: false,
        message:
          parsed.error.issues[0]?.message ||
          "Informe uma observação válida sobre o PIX.",
      };
    }

    const store = readLocalStore();
    let updatedCount = 0;

    for (const split of store.itemSplits) {
      // Anti-IDOR: filtra estritamente por split.userId === actor.id e status PENDING
      if (split.userId === actor.id && split.status === "PENDING") {
        split.paymentNote = `PIX informado: ${parsed.data.note}`;
        updatedCount++;
      }
    }

    if (updatedCount === 0) {
      return {
        success: false,
        message: "Você não possui cotas pendentes no momento.",
      };
    }

    writeLocalStore(store);
    safeRevalidate(["/meu-painel", "/admin"]);

    return {
      success: true,
      message: `Aviso de PIX registrado em ${updatedCount} ${
        updatedCount === 1 ? "cota pendente" : "cotas pendentes"
      }! O Administrador fará a conferência.`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro ao registrar aviso de PIX nas cotas pendentes.",
    };
  }
}
