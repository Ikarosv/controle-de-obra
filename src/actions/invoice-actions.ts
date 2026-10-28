// src/actions/invoice-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth, signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
  DEFAULT_PROJECT_SETTINGS,
  findUserByEmail,
  type Role,
  type SplitStatus,
} from "@/lib/db";
import { toCents } from "@/lib/split-calculator";

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
    // Ignorado quando executado fora do contexto de request HTTP do Next.js (ex: CLI de QA)
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

    const user = await findUserByEmail(email);
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
  rawInput: CreateInvoiceFormValues,
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    await resolveAdminActor(_testActor);

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
    const invoiceDate = new Date(
      data.date.includes("T") ? data.date : `${data.date}T12:00:00.000Z`
    );

    await prisma.$transaction(async (tx) => {
      const createdInvoice = await tx.invoice.create({
        data: {
          documentNumber: data.documentNumber,
          supplier: data.supplier,
          date: invoiceDate,
          categoryId: data.categoryId,
          installments: data.installments,
          pixKey: data.pixKey,
          paidBy: data.paidBy,
          observations: data.observations || null,
        },
      });

      for (const item of data.items) {
        const createdItem = await tx.invoiceItem.create({
          data: {
            invoiceId: createdInvoice.id,
            description: item.description,
            unit: item.unit || "un",
            quantity: Number(item.quantity),
            totalValue: new Prisma.Decimal(item.totalValue.toFixed(2)),
            stage: item.stage,
            splitModel: item.splitModel || "50/50",
          },
        });

        const activeSplits = item.splits.filter((s) => toCents(s.amountDue) > 0);
        for (const split of activeSplits) {
          await tx.itemSplit.create({
            data: {
              invoiceItemId: createdItem.id,
              userId: split.userId,
              amountDue: new Prisma.Decimal(split.amountDue.toFixed(2)),
              status: split.status as SplitStatus,
              paidAt: split.status === "PAID" ? new Date() : null,
              paymentNote:
                split.status === "PAID"
                  ? "Quitado no momento do lançamento"
                  : null,
            },
          });
        }
      }
    });

    safeRevalidate(["/admin", "/meu-painel"]);

    return {
      success: true,
      message: `Nota Fiscal ${data.documentNumber} (${data.items.length} ${
        data.items.length === 1 ? "item" : "itens"
      }) registrada com sucesso!`,
    };
  } catch (error) {
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
  paymentNote?: string,
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    await resolveAdminActor(_testActor);

    const split = await prisma.itemSplit.findUnique({
      where: { id: splitId },
    });

    if (!split) {
      return { success: false, message: "Cota de rateio não encontrada." };
    }

    const nextStatus = split.status === "PENDING" ? "PAID" : "PENDING";
    await prisma.itemSplit.update({
      where: { id: splitId },
      data: {
        status: nextStatus,
        paidAt: nextStatus === "PAID" ? new Date() : null,
        paymentNote:
          nextStatus === "PAID"
            ? paymentNote || "Pagamento confirmado pelo Administrador"
            : null,
      },
    });

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

export async function confirmSplitPaymentAction(
  splitId: string,
  note?: string,
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    await resolveAdminActor(_testActor);

    const split = await prisma.itemSplit.findUnique({
      where: { id: splitId },
    });

    if (!split) {
      return { success: false, message: "Cota de rateio não encontrada." };
    }

    await prisma.itemSplit.update({
      where: { id: splitId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentNote:
          note || "Pagamento PIX conferido e confirmado pelo Administrador",
      },
    });

    safeRevalidate(["/admin", "/meu-painel"]);

    return {
      success: true,
      message: "Pagamento confirmado com sucesso!",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao confirmar pagamento.",
    };
  }
}

export async function rejectSplitPaymentNoticeAction(
  splitId: string,
  rejectionReason?: string,
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    await resolveAdminActor(_testActor);

    const split = await prisma.itemSplit.findUnique({
      where: { id: splitId },
    });

    if (!split) {
      return { success: false, message: "Cota de rateio não encontrada." };
    }

    await prisma.itemSplit.update({
      where: { id: splitId },
      data: {
        status: "PENDING",
        paidAt: null,
        paymentNote: rejectionReason
          ? `Aviso rejeitado: ${rejectionReason}`
          : "Aviso de pagamento rejeitado pelo Administrador",
      },
    });

    safeRevalidate(["/admin", "/meu-painel"]);

    return {
      success: true,
      message: "Aviso de pagamento rejeitado.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro ao rejeitar aviso de pagamento.",
    };
  }
}

export async function settleAllUserSplitsAction(
  userId: string,
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    await resolveAdminActor(_testActor);

    const result = await prisma.itemSplit.updateMany({
      where: {
        userId,
        status: "PENDING",
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentNote: "Quitação em lote pelo Administrador",
      },
    });

    if (result.count === 0) {
      return {
        success: false,
        message: "Este participante não possui cotas pendentes.",
      };
    }

    safeRevalidate(["/admin", "/meu-painel"]);

    return {
      success: true,
      message: `${result.count} ${
        result.count === 1 ? "cota foi quitada" : "cotas foram quitadas"
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
  invoiceId: string,
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    await resolveAdminActor(_testActor);

    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!inv) {
      return { success: false, message: "Nota fiscal não encontrada." };
    }

    // O cascade no schema Prisma já remove automaticamente os itens e splits vinculados
    await prisma.invoice.delete({
      where: { id: invoiceId },
    });

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

export async function createUserAction(
  rawInput: {
    name: string;
    email: string;
    password: string;
    role: "ADMIN" | "PARTICIPANT";
    phone?: string;
    avatarColor?: string;
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

    const parsed = createUserSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Dados de usuário inválidos.",
      };
    }

    const data = parsed.data;
    const normalizedEmail = data.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return {
        success: false,
        message: "Já existe um usuário cadastrado com este e-mail.",
      };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    await prisma.user.create({
      data: {
        name: data.name,
        email: normalizedEmail,
        passwordHash,
        role: data.role,
        phone: data.phone || null,
        avatarColor: data.avatarColor || "#C26D53",
      },
    });

    safeRevalidate(["/admin"]);

    return {
      success: true,
      message: `Usuário ${data.name} (${data.role}) cadastrado com sucesso!`,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "Já existe um usuário cadastrado com este e-mail.",
      };
    }
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao criar participante.",
    };
  }
}

export async function createCategoryAction(
  rawInput: {
    name: string;
    description?: string;
    budgetLimit?: number;
  },
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    await resolveAdminActor(_testActor);

    const parsed = createCategorySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message:
          parsed.error.issues[0]?.message || "Nome de categoria inválido.",
      };
    }

    const { name, description, budgetLimit } = parsed.data;

    const existing = await prisma.category.findUnique({
      where: { name },
    });
    if (existing) {
      return {
        success: false,
        message: "Esta categoria já está cadastrada.",
      };
    }

    await prisma.category.create({
      data: {
        name,
        description: description || null,
        budgetLimit:
          budgetLimit !== undefined && budgetLimit !== null
            ? new Prisma.Decimal(budgetLimit.toFixed(2))
            : null,
      },
    });

    safeRevalidate(["/admin"]);

    return {
      success: true,
      message: `Categoria "${name}" adicionada!`,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "Esta categoria já está cadastrada.",
      };
    }
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao criar categoria.",
    };
  }
}

export async function updateStageBudgetAction(
  rawInput: {
    stage: string;
    budgetLimit: number;
  },
  _testActor?: SessionActor
): Promise<ActionResponse> {
  try {
    await resolveAdminActor(_testActor);

    const parsed = updateStageBudgetSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: "Valor de orçamento inválido.",
      };
    }

    const { stage, budgetLimit } = parsed.data;

    await prisma.stageBudget.upsert({
      where: { stage },
      update: {
        budgetLimit: new Prisma.Decimal(budgetLimit.toFixed(2)),
      },
      create: {
        stage,
        budgetLimit: new Prisma.Decimal(budgetLimit.toFixed(2)),
        orderIndex: await prisma.stageBudget.count(),
      },
    });

    safeRevalidate(["/admin"]);

    return {
      success: true,
      message: `Meta da etapa "${stage}" atualizada!`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao atualizar meta.",
    };
  }
}

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

    let updatedInvoicesCount = 0;

    await prisma.$transaction(async (tx) => {
      await tx.projectSettings.upsert({
        where: { id: "default" },
        update: {
          projectName: data.projectName,
          officialPixKey: data.officialPixKey,
          pixReceiverName: data.pixReceiverName,
        },
        create: {
          id: "default",
          projectName: data.projectName,
          officialPixKey: data.officialPixKey,
          pixReceiverName: data.pixReceiverName,
        },
      });

      if (shouldApplyToPending) {
        const pendingInvoices = await tx.invoice.findMany({
          where: {
            items: {
              some: {
                splits: {
                  some: {
                    status: "PENDING",
                  },
                },
              },
            },
          },
          select: { id: true },
        });

        if (pendingInvoices.length > 0) {
          const invoiceIds = pendingInvoices.map((inv) => inv.id);
          const updateResult = await tx.invoice.updateMany({
            where: {
              id: { in: invoiceIds },
            },
            data: {
              pixKey: data.officialPixKey,
            },
          });
          updatedInvoicesCount = updateResult.count;
        }
      }
    });

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

    // Anti-IDOR: busca estritamente pelo ID do usuário autenticado na sessão
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
    });

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

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);

    await prisma.user.update({
      where: { id: actor.id },
      data: { passwordHash: newHash },
    });

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

    const targetUser = await prisma.user.findUnique({
      where: { id: parsed.data.targetUserId },
    });

    if (!targetUser) {
      return {
        success: false,
        message: "Participante não encontrado.",
      };
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);

    await prisma.user.update({
      where: { id: parsed.data.targetUserId },
      data: { passwordHash: newHash },
    });

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

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return {
        success: false,
        message: "Participante não encontrado.",
      };
    }

    const splitsCount = await prisma.itemSplit.count({
      where: { userId: targetUserId },
    });

    if (splitsCount > 0) {
      return {
        success: false,
        message:
          "Não é possível remover um participante que já possui cotas vinculadas em notas fiscais.",
      };
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    safeRevalidate(["/admin"]);

    return {
      success: true,
      message: `Participante ${targetUser.name} removido com sucesso.`,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        message:
          "Não é possível remover o participante pois existem registros dependentes vinculados no banco de dados.",
      };
    }
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Erro ao remover participante.",
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

    const split = await prisma.itemSplit.findUnique({
      where: { id: parsed.data.splitId },
    });

    if (!split) {
      return {
        success: false,
        message: "Cota de rateio não encontrada.",
      };
    }

    // Blindagem Anti-IDOR estrita: o usuário autenticado deve ser titular estrito da cota
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

    await prisma.itemSplit.update({
      where: { id: parsed.data.splitId },
      data: {
        paymentNote: `PIX informado: ${parsed.data.note}`,
      },
    });

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

    // Anti-IDOR: filtra estritamente por split.userId === actor.id e status PENDING
    const result = await prisma.itemSplit.updateMany({
      where: {
        userId: actor.id,
        status: "PENDING",
      },
      data: {
        paymentNote: `PIX informado: ${parsed.data.note}`,
      },
    });

    if (result.count === 0) {
      return {
        success: false,
        message: "Você não possui cotas pendentes no momento.",
      };
    }

    safeRevalidate(["/meu-painel", "/admin"]);

    return {
      success: true,
      message: `Aviso de PIX registrado em ${result.count} ${
        result.count === 1 ? "cota pendente" : "cotas pendentes"
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
