// src/lib/db.ts
import fs from "fs";
import os from "os";
import path from "path";
import bcrypt from "bcryptjs";
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

export interface LocalDatabaseSchema {
  users: UserRecord[];
  categories: CategoryRecord[];
  stageBudgets: StageBudgetRecord[];
  invoices: InvoiceRecord[];
  invoiceItems: InvoiceItemRecord[];
  itemSplits: ItemSplitRecord[];
  projectSettings: ProjectSettingsRecord;
  settings?: ProjectSettingsRecord;
}

function resolveWritableDataDir(): string {
  const defaultDir = path.join(process.cwd(), ".data");
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "controle-obra-data");
  }
  return defaultDir;
}

const DATA_DIR = resolveWritableDataDir();
const DB_FILE = path.join(DATA_DIR, "controle-obra-db.json");

export const DEFAULT_PROJECT_SETTINGS: ProjectSettingsRecord = {
  id: "default",
  projectName: "Residência • Controle de Obra",
  officialPixKey: DEFAULT_PIX_KEY,
  pixReceiverName: "Ikaro (Administrador)",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

function buildInitialSeed(): LocalDatabaseSchema {
  const adminPasswordHash = bcrypt.hashSync("admin123", 10);
  const participantPasswordHash = bcrypt.hashSync("obra123", 10);

  const adminId = "11111111-1111-4111-8111-111111111111";
  const partner1Id = "22222222-2222-4222-8222-222222222222";
  const partner2Id = "33333333-3333-4333-8333-333333333333";

  const users: UserRecord[] = [
    {
      id: adminId,
      name: "Ikaro (Administrador)",
      email: "admin@obra.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      avatarColor: "#292524",
      phone: "(11) 99876-5432",
      createdAt: "2026-09-01T10:00:00.000Z",
    },
    {
      id: partner1Id,
      name: "Mariana Silva (Participante)",
      email: "mariana@obra.com",
      passwordHash: participantPasswordHash,
      role: "PARTICIPANT",
      avatarColor: "#C26D53",
      phone: "(11) 98765-1234",
      createdAt: "2026-09-01T10:05:00.000Z",
    },
    {
      id: partner2Id,
      name: "Carlos Eduardo (Participante)",
      email: "carlos@obra.com",
      passwordHash: participantPasswordHash,
      role: "PARTICIPANT",
      avatarColor: "#4D6B53",
      phone: "(11) 97654-9876",
      createdAt: "2026-09-02T14:20:00.000Z",
    },
  ];

  const catFundacao = "aaaa1111-1111-4111-8111-111111111111";
  const catAlvenaria = "aaaa2222-2222-4222-8222-222222222222";
  const catHidraulica = "aaaa3333-3333-4333-8333-333333333333";
  const catEletrica = "aaaa4444-4444-4444-8444-444444444444";
  const catAcabamento = "aaaa5555-5555-4555-8555-555555555555";
  const catProjetos = "aaaa6666-6666-4666-8666-666666666666";

  const categories: CategoryRecord[] = [
    {
      id: catProjetos,
      name: "Projetos, Taxas & Engenharia",
      description: "ART, projetos arquitetônicos, estrutural e alvarás",
      budgetLimit: 18000,
      createdAt: "2026-09-01T10:00:00.000Z",
    },
    {
      id: catFundacao,
      name: "Fundação & Concreto Usinado",
      description: "Brocas, sapatas, vigas baldrame, aço e impermeabilização",
      budgetLimit: 45000,
      createdAt: "2026-09-01T10:00:00.000Z",
    },
    {
      id: catAlvenaria,
      name: "Alvenaria & Estrutura",
      description: "Blocos cerâmicos, cimento, areia, brita e lajes",
      budgetLimit: 60000,
      createdAt: "2026-09-01T10:00:00.000Z",
    },
    {
      id: catHidraulica,
      name: "Hidráulica & Esgoto",
      description: "Tubos PVC, conexões, caixas d'água e registros",
      budgetLimit: 22000,
      createdAt: "2026-09-01T10:00:00.000Z",
    },
    {
      id: catEletrica,
      name: "Elétrica & Iluminação",
      description: "Cabos flexíveis, quadro de distribuição, disjuntores e conduítes",
      budgetLimit: 25000,
      createdAt: "2026-09-01T10:00:00.000Z",
    },
    {
      id: catAcabamento,
      name: "Revestimentos, Porcelanato & Louças",
      description: "Pisos, argamassa AC-III, bancadas em granito e metais",
      budgetLimit: 55000,
      createdAt: "2026-09-01T10:00:00.000Z",
    },
  ];

  const defaultBudgets = [18000, 48000, 62000, 28000, 35000, 45000, 38000, 32000];
  const stageBudgets: StageBudgetRecord[] = STAGES.map((stage, idx) => ({
    id: `bbbb000${idx + 1}-1111-4111-8111-111111111111`,
    stage,
    budgetLimit: defaultBudgets[idx] ?? 30000,
    orderIndex: idx,
  }));

  const inv1 = "cccc1111-1111-4111-8111-111111111111";
  const inv2 = "cccc2222-2222-4222-8222-222222222222";
  const inv3 = "cccc3333-3333-4333-8333-333333333333";
  const inv4 = "cccc4444-4444-4444-8444-444444444444";

  const invoices: InvoiceRecord[] = [
    {
      id: inv1,
      documentNumber: "NF-004819",
      supplier: "Engemix Concreto & Aço",
      date: "2026-09-18T12:00:00.000Z",
      categoryId: catFundacao,
      installments: 3,
      pixKey: DEFAULT_PIX_KEY,
      paidBy: "Ikaro (Administrador)",
      observations: "Concretagem das sapatas e vigas baldrame. Bombeamento incluso. Parcelado em 3x no boleto/cartão.",
      createdAt: "2026-09-18T15:30:00.000Z",
    },
    {
      id: inv2,
      documentNumber: "NF-009142",
      supplier: "Obramax Atacado da Construção",
      date: "2026-10-04T12:00:00.000Z",
      categoryId: catAlvenaria,
      installments: 2,
      pixKey: DEFAULT_PIX_KEY,
      paidBy: "Ikaro (Administrador)",
      observations: "Compra de blocos estruturais, cimento CP-II e impermeabilizante para respaldo das vigas.",
      createdAt: "2026-10-04T17:10:00.000Z",
    },
    {
      id: inv3,
      documentNumber: "NF-011508",
      supplier: "Tigre / Hidrotécnica Materiais",
      date: "2026-10-15T12:00:00.000Z",
      categoryId: catHidraulica,
      installments: 4,
      pixKey: DEFAULT_PIX_KEY,
      paidBy: "Ikaro (Administrador)",
      observations: "Tubulação completa de água fria/quente (Aquatherm) e esgoto do pavimento térreo.",
      createdAt: "2026-10-15T11:00:00.000Z",
    },
    {
      id: inv4,
      documentNumber: "NF-012890",
      supplier: "Portobello Shop / Leroy Merlin",
      date: "2026-10-22T12:00:00.000Z",
      categoryId: catAcabamento,
      installments: 6,
      pixKey: DEFAULT_PIX_KEY,
      paidBy: "Mariana Silva (Participante)",
      observations: "Adiantamento do porcelanato acetinado 90x90 da área social e argamassa AC-III.",
      createdAt: "2026-10-22T16:45:00.000Z",
    },
  ];

  const item1 = "dddd1111-1111-4111-8111-111111111111";
  const item2 = "dddd2222-2222-4222-8222-222222222222";
  const item3 = "dddd3333-3333-4333-8333-333333333333";
  const item4 = "dddd4444-4444-4444-8444-444444444444";
  const item5 = "dddd5555-5555-4555-8555-555555555555";
  const item6 = "dddd6666-6666-4666-8666-666666666666";
  const item7 = "dddd7777-7777-4777-8777-777777777777";

  const invoiceItems: InvoiceItemRecord[] = [
    {
      id: item1,
      invoiceId: inv1,
      description: "Concreto Usinado FCK 30MPa Bombeado",
      unit: "m³",
      quantity: 18,
      totalValue: 10800,
      stage: "Terraplenagem & Fundação",
      splitModel: "50/50",
    },
    {
      id: item2,
      invoiceId: inv1,
      description: "Vergalhão CA-50 10mm (3/8) Gerdau + Estribos",
      unit: "un",
      quantity: 65,
      totalValue: 4200,
      stage: "Terraplenagem & Fundação",
      splitModel: "50/50",
    },
    {
      id: item3,
      invoiceId: inv2,
      description: "Cimento CP-II E-32 50kg Votoran",
      unit: "sc",
      quantity: 80,
      totalValue: 2880,
      stage: "Estrutura & Alvenaria",
      splitModel: "50/50",
    },
    {
      id: item4,
      invoiceId: inv2,
      description: "Milheiro de Bloco Cerâmico Vedação 14x19x29",
      unit: "un",
      quantity: 4.5,
      totalValue: 5400,
      stage: "Estrutura & Alvenaria",
      splitModel: "60/40",
    },
    {
      id: item5,
      invoiceId: inv3,
      description: "Kit Tubos e Conexões Água Quente/Fria PPR Tigre",
      unit: "vb",
      quantity: 1,
      totalValue: 4600,
      stage: "Instalações (Elétrica & Hidráulica)",
      splitModel: "50/50",
    },
    {
      id: item6,
      invoiceId: inv3,
      description: "Quadros de Distribuição Embutir + Conduítes Corrugados",
      unit: "un",
      quantity: 4,
      totalValue: 1800,
      stage: "Instalações (Elétrica & Hidráulica)",
      splitModel: "CUSTOM",
    },
    {
      id: item7,
      invoiceId: inv4,
      description: "Porcelanato Acetinado Warm Stone 90x90cm + Argamassa AC-III",
      unit: "m²",
      quantity: 95,
      totalValue: 11400,
      stage: "Revestimentos & Pisos",
      splitModel: "50/50",
    },
  ];

  const itemSplits: ItemSplitRecord[] = [
    // Item 1: 10800 -> 5400 Ikaro (Pago), 5400 Mariana (Pago)
    {
      id: "eeee1111-1111-4111-8111-111111111111",
      invoiceItemId: item1,
      userId: adminId,
      amountDue: 5400,
      status: "PAID",
      paidAt: "2026-09-18T16:00:00.000Z",
      paymentNote: "Pago direto ao fornecedor",
    },
    {
      id: "eeee1112-1111-4111-8111-111111111111",
      invoiceItemId: item1,
      userId: partner1Id,
      amountDue: 5400,
      status: "PAID",
      paidAt: "2026-09-20T14:22:00.000Z",
      paymentNote: "PIX recebido ref. NF-004819",
    },
    // Item 2: 4200 -> 2100 Ikaro (Pago), 2100 Mariana (Pago)
    {
      id: "eeee2221-2222-4222-8222-222222222222",
      invoiceItemId: item2,
      userId: adminId,
      amountDue: 2100,
      status: "PAID",
      paidAt: "2026-09-18T16:00:00.000Z",
      paymentNote: "Pago direto ao fornecedor",
    },
    {
      id: "eeee2222-2222-4222-8222-222222222222",
      invoiceItemId: item2,
      userId: partner1Id,
      amountDue: 2100,
      status: "PAID",
      paidAt: "2026-09-20T14:22:00.000Z",
      paymentNote: "PIX recebido ref. NF-004819",
    },
    // Item 3: 2880 -> 1440 Ikaro (Pago), 1440 Mariana (Pendente)
    {
      id: "eeee3331-3333-4333-8333-333333333333",
      invoiceItemId: item3,
      userId: adminId,
      amountDue: 1440,
      status: "PAID",
      paidAt: "2026-10-04T17:15:00.000Z",
      paymentNote: "Titular da compra",
    },
    {
      id: "eeee3332-3333-4333-8333-333333333333",
      invoiceItemId: item3,
      userId: partner1Id,
      amountDue: 1440,
      status: "PENDING",
      paidAt: null,
      paymentNote: null,
    },
    // Item 4: 5400 -> 3240 Ikaro (60%), 2160 Mariana (40% Pendente)
    {
      id: "eeee4441-4444-4444-8444-444444444444",
      invoiceItemId: item4,
      userId: adminId,
      amountDue: 3240,
      status: "PAID",
      paidAt: "2026-10-04T17:15:00.000Z",
      paymentNote: "Titular da compra",
    },
    {
      id: "eeee4442-4444-4444-8444-444444444444",
      invoiceItemId: item4,
      userId: partner1Id,
      amountDue: 2160,
      status: "PENDING",
      paidAt: null,
      paymentNote: null,
    },
    // Item 5: 4600 -> 2300 Ikaro, 2300 Mariana (Pendente)
    {
      id: "eeee5551-5555-4555-8555-555555555555",
      invoiceItemId: item5,
      userId: adminId,
      amountDue: 2300,
      status: "PAID",
      paidAt: "2026-10-15T11:00:00.000Z",
      paymentNote: "Titular da compra",
    },
    {
      id: "eeee5552-5555-4555-8555-555555555555",
      invoiceItemId: item5,
      userId: partner1Id,
      amountDue: 2300,
      status: "PENDING",
      paidAt: null,
      paymentNote: null,
    },
    // Item 6: 1800 -> 600 Ikaro, 600 Mariana (Pendente), 600 Carlos (Pendente)
    {
      id: "eeee6661-6666-4666-8666-666666666666",
      invoiceItemId: item6,
      userId: adminId,
      amountDue: 600,
      status: "PAID",
      paidAt: "2026-10-15T11:00:00.000Z",
      paymentNote: "Titular da compra",
    },
    {
      id: "eeee6662-6666-4666-8666-666666666666",
      invoiceItemId: item6,
      userId: partner1Id,
      amountDue: 600,
      status: "PENDING",
      paidAt: null,
      paymentNote: null,
    },
    {
      id: "eeee6663-6666-4666-8666-666666666666",
      invoiceItemId: item6,
      userId: partner2Id,
      amountDue: 600,
      status: "PENDING",
      paidAt: null,
      paymentNote: null,
    },
    // Item 7: 11400 -> 5700 Ikaro (Pago), 5700 Mariana (Pago)
    {
      id: "eeee7771-7777-4777-8777-777777777777",
      invoiceItemId: item7,
      userId: adminId,
      amountDue: 5700,
      status: "PAID",
      paidAt: "2026-10-23T09:30:00.000Z",
      paymentNote: "Acerto cruzado NF-012890",
    },
    {
      id: "eeee7772-7777-4777-8777-777777777777",
      invoiceItemId: item7,
      userId: partner1Id,
      amountDue: 5700,
      status: "PAID",
      paidAt: "2026-10-22T16:45:00.000Z",
      paymentNote: "Pago pela Mariana na loja",
    },
  ];

  return {
    users,
    categories,
    stageBudgets,
    invoices,
    invoiceItems,
    itemSplits,
    projectSettings: { ...DEFAULT_PROJECT_SETTINGS },
    settings: { ...DEFAULT_PROJECT_SETTINGS },
  };
}

export function readLocalStore(): LocalDatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = buildInitialSeed();
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      } catch {
        // Ignore read-only filesystem write errors
      }
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LocalDatabaseSchema>;
    let needsMigration = false;

    const existingSettings = parsed.projectSettings || parsed.settings;
    const normalizedSettings: ProjectSettingsRecord = existingSettings
      ? {
          id: existingSettings.id || "default",
          projectName:
            existingSettings.projectName || DEFAULT_PROJECT_SETTINGS.projectName,
          officialPixKey:
            existingSettings.officialPixKey ||
            DEFAULT_PROJECT_SETTINGS.officialPixKey,
          pixReceiverName:
            existingSettings.pixReceiverName ||
            DEFAULT_PROJECT_SETTINGS.pixReceiverName,
          updatedAt:
            existingSettings.updatedAt || DEFAULT_PROJECT_SETTINGS.updatedAt,
        }
      : { ...DEFAULT_PROJECT_SETTINGS };

    if (!parsed.projectSettings || !parsed.settings) {
      needsMigration = true;
    }

    const store: LocalDatabaseSchema = {
      users: parsed.users ?? [],
      categories: parsed.categories ?? [],
      stageBudgets: parsed.stageBudgets ?? [],
      invoices: parsed.invoices ?? [],
      invoiceItems: parsed.invoiceItems ?? [],
      itemSplits: parsed.itemSplits ?? [],
      projectSettings: normalizedSettings,
      settings: normalizedSettings,
    };

    if (needsMigration) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf-8");
      } catch {
        // Ignore read-only filesystem write errors
      }
    }

    return store;
  } catch {
    return buildInitialSeed();
  }
}

export function writeLocalStore(data: LocalDatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const syncedSettings = data.projectSettings || data.settings || {
      ...DEFAULT_PROJECT_SETTINGS,
    };
    data.projectSettings = syncedSettings;
    data.settings = syncedSettings;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[writeLocalStore Warning]:", err);
  }
}

// Detecta se existe um banco PostgreSQL remoto configurado de fato (Vercel Postgres / Supabase)
const useRemotePostgres =
  Boolean(process.env.USE_REMOTE_POSTGRES === "true") &&
  Boolean(process.env.DATABASE_URL) &&
  !process.env.DATABASE_URL?.includes("localhost:5432");

// ============================================================================
// CAMADA REPOSITÓRIO UNIFICADA (Prisma PostgreSQL ou Local Relacional Persistente)
// ============================================================================

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalized = email.trim().toLowerCase();
  if (useRemotePostgres) {
    try {
      const u = await prisma.user.findUnique({ where: { email: normalized } });
      if (!u) return null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role,
        avatarColor: u.avatarColor,
        phone: u.phone,
        createdAt: u.createdAt.toISOString(),
      };
    } catch {
      // Fallback para store local
    }
  }
  const store = readLocalStore();
  return store.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function getProjectSettings(): Promise<ProjectSettingsRecord> {
  if (useRemotePostgres) {
    try {
      const s = await prisma.projectSettings.findUnique({
        where: { id: "default" },
      });
      if (s) {
        return {
          id: s.id,
          projectName: s.projectName,
          officialPixKey: s.officialPixKey,
          pixReceiverName: s.pixReceiverName,
          updatedAt: s.updatedAt.toISOString(),
        };
      }
    } catch {
      // Fallback para store local
    }
  }
  const store = readLocalStore();
  return store.projectSettings || store.settings || { ...DEFAULT_PROJECT_SETTINGS };
}

export async function getAllUsers() {
  const store = readLocalStore();
  return store.users.map((u) => {
    const userSplits = store.itemSplits.filter((s) => s.userId === u.id);
    const totalPending = fromCents(
      userSplits
        .filter((s) => s.status === "PENDING")
        .reduce((acc, s) => acc + toCents(s.amountDue), 0)
    );
    const totalPaid = fromCents(
      userSplits
        .filter((s) => s.status === "PAID")
        .reduce((acc, s) => acc + toCents(s.amountDue), 0)
    );

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatarColor: u.avatarColor,
      phone: u.phone,
      createdAt: u.createdAt,
      totalPending,
      totalPaid,
      splitsCount: userSplits.length,
    };
  });
}

export async function getAllCategories(): Promise<CategoryRecord[]> {
  const store = readLocalStore();
  return [...store.categories].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllStageBudgets(): Promise<StageBudgetRecord[]> {
  const store = readLocalStore();
  return [...store.stageBudgets].sort((a, b) => a.orderIndex - b.orderIndex);
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
  const store = readLocalStore();
  const userMap = new Map(store.users.map((u) => [u.id, u]));
  const categoryMap = new Map(store.categories.map((c) => [c.id, c]));

  const sortedInvoices = [...store.invoices].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return sortedInvoices.map((inv) => {
    const rawItems = store.invoiceItems.filter((item) => item.invoiceId === inv.id);

    const items = rawItems.map((item) => {
      const rawSplits = store.itemSplits.filter(
        (split) => split.invoiceItemId === item.id
      );

      const splits = rawSplits.map((split) => {
        const u = userMap.get(split.userId);
        return {
          id: split.id,
          userId: split.userId,
          userName: u?.name ?? "Usuário",
          userRole: u?.role ?? "PARTICIPANT",
          userAvatarColor: u?.avatarColor ?? "#78716C",
          amountDue: Number(split.amountDue),
          status: split.status,
          paidAt: split.paidAt,
          paymentNote: split.paymentNote,
        };
      });

      return {
        id: item.id,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        totalValue: fromCents(toCents(item.totalValue)),
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
      date: inv.date,
      categoryId: inv.categoryId,
      categoryName: categoryMap.get(inv.categoryId)?.name ?? "Geral",
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
  const store = readLocalStore();
  const categoryMap = new Map(store.categories.map((c) => [c.id, c]));
  const itemMap = new Map(store.invoiceItems.map((i) => [i.id, i]));
  const invoiceMap = new Map(store.invoices.map((inv) => [inv.id, inv]));

  const mySplits = store.itemSplits.filter((s) => s.userId === userId);

  const hydrated = mySplits
    .map((split) => {
      const item = itemMap.get(split.invoiceItemId);
      if (!item) return null;
      const invoice = invoiceMap.get(item.invoiceId);
      if (!invoice) return null;

      const installments = Math.max(1, invoice.installments);
      const amountDue = fromCents(toCents(split.amountDue));

      return {
        id: split.id,
        amountDue,
        installmentValue: fromCents(Math.round(toCents(amountDue) / installments)),
        status: split.status,
        paidAt: split.paidAt,
        paymentNote: split.paymentNote,
        item: {
          id: item.id,
          description: item.description,
          unit: item.unit,
          quantity: Number(item.quantity),
          totalItemValue: fromCents(toCents(item.totalValue)),
          stage: item.stage,
          splitModel: item.splitModel,
        },
        invoice: {
          id: invoice.id,
          documentNumber: invoice.documentNumber,
          supplier: invoice.supplier,
          date: invoice.date,
          categoryName: categoryMap.get(invoice.categoryId)?.name ?? "Geral",
          installments,
          pixKey: invoice.pixKey,
          paidBy: invoice.paidBy,
          observations: invoice.observations,
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  hydrated.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "PENDING" ? -1 : 1;
    }
    return new Date(b.invoice.date).getTime() - new Date(a.invoice.date).getTime();
  });

  return hydrated;
}
