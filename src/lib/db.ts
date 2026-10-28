// src/lib/db.ts
import { prisma } from "@/lib/prisma";
import { STAGES, DEFAULT_PIX_KEY } from "@/lib/constants";
import { toCents, fromCents } from "@/lib/split-calculator";

export type Role = "ADMIN" | "PARTICIPANT";
export type SplitStatus = "PENDING" | "PAID";

export interface ProjectSettingsRecord {
  id: string;
  projectName: string;
  officialPixKey: string;
  pixReceiverName: string;
  updatedAt: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  avatarColor: string;
  phone: string | null;
  createdAt: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  description: string | null;
  budgetLimit: number | null;
  createdAt: string;
}

export interface StageBudgetRecord {
  id: string;
  stage: string;
  budgetLimit: number;
  orderIndex: number;
}

export interface ItemSplitRecord {
  id: string;
  invoiceItemId: string;
  userId: string;
  amountDue: number;
  status: SplitStatus;
  paidAt: string | null;
  paymentNote: string | null;
}

export interface InvoiceItemRecord {
  id: string;
  invoiceId: string;
  description: string;
  unit: string;
  quantity: number;
  totalValue: number;
  stage: string;
  splitModel: string;
}

export interface InvoiceRecord {
  id: string;
  documentNumber: string;
  supplier: string;
  date: string;
  categoryId: string;
  installments: number;
  pixKey: string;
  paidBy: string;
  observations: string | null;
  createdAt: string;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettingsRecord = {
  id: "default",
  projectName: "Residência • Controle de Obra",
  officialPixKey: DEFAULT_PIX_KEY,
  pixReceiverName: "Ikaro (Administrador)",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

function formatDateString(val: Date | string | null | undefined): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  return new Date(val).toISOString();
}

function formatNullableDateString(val: Date | string | null | undefined): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  return new Date(val).toISOString();
}

// ============================================================================
// CAMADA REPOSITÓRIO EXCLUSIVA PRISMA CLIENT (POSTGRESQL / SUPABASE)
// ============================================================================

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalized = email.trim().toLowerCase();
  const u = await prisma.user.findUnique({
    where: { email: normalized },
  });

  if (!u) return null;

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    passwordHash: u.passwordHash,
    role: u.role as Role,
    avatarColor: u.avatarColor,
    phone: u.phone,
    createdAt: formatDateString(u.createdAt),
  };
}

export async function getProjectSettings(): Promise<ProjectSettingsRecord> {
  let settings = await prisma.projectSettings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    settings = await prisma.projectSettings.create({
      data: {
        id: "default",
        projectName: DEFAULT_PROJECT_SETTINGS.projectName,
        officialPixKey: DEFAULT_PROJECT_SETTINGS.officialPixKey,
        pixReceiverName: DEFAULT_PROJECT_SETTINGS.pixReceiverName,
      },
    });
  }

  return {
    id: settings.id,
    projectName: settings.projectName,
    officialPixKey: settings.officialPixKey,
    pixReceiverName: settings.pixReceiverName,
    updatedAt: formatDateString(settings.updatedAt),
  };
}

export async function getAllUsers() {
  const dbUsers = await prisma.user.findMany({
    include: { splits: true },
    orderBy: { name: "asc" },
  });

  return dbUsers.map((u) => {
    const splits = u.splits || [];
    const totalPending = fromCents(
      splits
        .filter((s) => s.status === "PENDING")
        .reduce((acc, s) => acc + toCents(Number(s.amountDue)), 0)
    );
    const totalPaid = fromCents(
      splits
        .filter((s) => s.status === "PAID")
        .reduce((acc, s) => acc + toCents(Number(s.amountDue)), 0)
    );

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as Role,
      avatarColor: u.avatarColor,
      phone: u.phone,
      createdAt: formatDateString(u.createdAt),
      totalPending,
      totalPaid,
      splitsCount: splits.length,
    };
  });
}

export async function getAllCategories(): Promise<CategoryRecord[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    budgetLimit: c.budgetLimit !== null ? Number(c.budgetLimit) : null,
    createdAt: formatDateString(c.createdAt),
  }));
}

export async function getAllStageBudgets(): Promise<StageBudgetRecord[]> {
  const stageBudgets = await prisma.stageBudget.findMany({
    orderBy: { orderIndex: "asc" },
  });

  return stageBudgets.map((sb) => ({
    id: sb.id,
    stage: sb.stage,
    budgetLimit: Number(sb.budgetLimit),
    orderIndex: sb.orderIndex,
  }));
}

export interface HydratedInvoice {
  id: string;
  documentNumber: string;
  supplier: string;
  date: string;
  categoryId: string;
  categoryName: string;
  installments: number;
  pixKey: string;
  paidBy: string;
  observations: string | null;
  totalInvoiceValue: number;
  pendingInvoiceValue: number;
  paidInvoiceValue: number;
  items: {
    id: string;
    description: string;
    unit: string;
    quantity: number;
    totalValue: number;
    stage: string;
    splitModel: string;
    splits: {
      id: string;
      userId: string;
      userName: string;
      userRole: Role;
      userAvatarColor: string;
      amountDue: number;
      status: SplitStatus;
      paidAt: string | null;
      paymentNote: string | null;
    }[];
  }[];
}

export async function getHydratedInvoices(): Promise<HydratedInvoice[]> {
  const invoices = await prisma.invoice.findMany({
    include: {
      category: true,
      items: {
        include: {
          splits: {
            include: {
              user: true,
            },
          },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  return invoices.map((inv) => {
    const items = inv.items.map((item) => {
      const splits = item.splits.map((split) => ({
        id: split.id,
        userId: split.userId,
        userName: split.user?.name ?? "Usuário",
        userRole: (split.user?.role as Role) ?? "PARTICIPANT",
        userAvatarColor: split.user?.avatarColor ?? "#78716C",
        amountDue: fromCents(toCents(Number(split.amountDue))),
        status: split.status as SplitStatus,
        paidAt: formatNullableDateString(split.paidAt),
        paymentNote: split.paymentNote,
      }));

      const totalValue = fromCents(toCents(Number(item.totalValue)));

      return {
        id: item.id,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        totalValue,
        stage: item.stage,
        splitModel: item.splitModel,
        splits,
      };
    });

    const totalInvoiceValue = fromCents(
      items.reduce((acc, i) => acc + toCents(i.totalValue), 0)
    );
    const pendingInvoiceValue = fromCents(
      items.reduce(
        (acc, i) =>
          acc +
          i.splits
            .filter((s) => s.status === "PENDING")
            .reduce((sum, s) => sum + toCents(s.amountDue), 0),
        0
      )
    );
    const paidInvoiceValue = fromCents(
      items.reduce(
        (acc, i) =>
          acc +
          i.splits
            .filter((s) => s.status === "PAID")
            .reduce((sum, s) => sum + toCents(s.amountDue), 0),
        0
      )
    );

    return {
      id: inv.id,
      documentNumber: inv.documentNumber,
      supplier: inv.supplier,
      date: formatDateString(inv.date),
      categoryId: inv.categoryId,
      categoryName: inv.category?.name ?? "Geral",
      installments: inv.installments,
      pixKey: inv.pixKey,
      paidBy: inv.paidBy,
      observations: inv.observations,
      totalInvoiceValue,
      pendingInvoiceValue,
      paidInvoiceValue,
      items,
    };
  });
}

export async function getParticipantSplits(userId: string) {
  const itemSplits = await prisma.itemSplit.findMany({
    where: { userId },
    include: {
      invoiceItem: {
        include: {
          invoice: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { invoiceItem: { invoice: { date: "desc" } } },
    ],
  });

  return itemSplits.map((split) => {
    const item = split.invoiceItem;
    const invoice = item.invoice;
    const installments = Math.max(1, invoice.installments);
    const amountDue = fromCents(toCents(Number(split.amountDue)));

    return {
      id: split.id,
      amountDue,
      installmentValue: fromCents(Math.round(toCents(amountDue) / installments)),
      status: split.status as SplitStatus,
      paidAt: formatNullableDateString(split.paidAt),
      paymentNote: split.paymentNote,
      item: {
        id: item.id,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        totalItemValue: fromCents(toCents(Number(item.totalValue))),
        stage: item.stage,
        splitModel: item.splitModel,
      },
      invoice: {
        id: invoice.id,
        documentNumber: invoice.documentNumber,
        supplier: invoice.supplier,
        date: formatDateString(invoice.date),
        categoryName: invoice.category?.name ?? "Geral",
        installments,
        pixKey: invoice.pixKey,
        paidBy: invoice.paidBy,
        observations: invoice.observations,
      },
    };
  });
}
