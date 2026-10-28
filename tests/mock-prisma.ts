// tests/mock-prisma.ts
import crypto from "crypto";
import bcrypt from "bcryptjs";

export interface TestState {
  users: any[];
  categories: any[];
  stageBudgets: any[];
  projectSettings: any;
  invoices: any[];
  invoiceItems: any[];
  itemSplits: any[];
}

export function buildDefaultTestState(): TestState {
  const adminPasswordHash = bcrypt.hashSync("admin123", 10);
  const participantPasswordHash = bcrypt.hashSync("obra123", 10);

  const adminId = "11111111-1111-4111-8111-111111111111";
  const marianaId = "22222222-2222-4222-8222-222222222222";
  const carlosId = "33333333-3333-4333-8333-333333333333";

  const users = [
    {
      id: adminId,
      name: "Ikaro (Administrador)",
      email: "admin@obra.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      avatarColor: "#292524",
      phone: "(11) 99876-5432",
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    {
      id: marianaId,
      name: "Mariana Silva (Participante)",
      email: "mariana@obra.com",
      passwordHash: participantPasswordHash,
      role: "PARTICIPANT",
      avatarColor: "#C26D53",
      phone: "(11) 98765-1234",
      createdAt: new Date("2026-09-01T10:05:00.000Z"),
    },
    {
      id: carlosId,
      name: "Carlos Eduardo (Participante)",
      email: "carlos@obra.com",
      passwordHash: participantPasswordHash,
      role: "PARTICIPANT",
      avatarColor: "#4D6B53",
      phone: "(11) 97654-9876",
      createdAt: new Date("2026-09-02T14:20:00.000Z"),
    },
  ];

  const catFundacao = "aaaa1111-1111-4111-8111-111111111111";
  const catAlvenaria = "aaaa2222-2222-4222-8222-222222222222";
  const catHidraulica = "aaaa3333-3333-4333-8333-333333333333";
  const catEletrica = "aaaa4444-4444-4444-8444-444444444444";
  const catAcabamento = "aaaa5555-5555-4555-8555-555555555555";
  const catProjetos = "aaaa6666-6666-4666-8666-666666666666";

  const categories = [
    {
      id: catProjetos,
      name: "Projetos, Taxas & Engenharia",
      description: "ART, projetos arquitetônicos, estrutural e alvarás",
      budgetLimit: 18000,
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    {
      id: catFundacao,
      name: "Fundação & Concreto Usinado",
      description: "Brocas, sapatas, vigas baldrame, aço e impermeabilização",
      budgetLimit: 45000,
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    {
      id: catAlvenaria,
      name: "Alvenaria & Estrutura",
      description: "Blocos cerâmicos, cimento, areia, brita e lajes",
      budgetLimit: 60000,
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    {
      id: catHidraulica,
      name: "Hidráulica & Esgoto",
      description: "Tubos PVC, conexões, caixas d'água e registros",
      budgetLimit: 22000,
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    {
      id: catEletrica,
      name: "Elétrica & Iluminação",
      description: "Cabos flexíveis, quadro de distribuição, disjuntores e conduítes",
      budgetLimit: 25000,
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    {
      id: catAcabamento,
      name: "Revestimentos, Porcelanato & Louças",
      description: "Pisos, argamassa AC-III, bancadas em granito e metais",
      budgetLimit: 55000,
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
    },
  ];

  const stages = [
    "Terraplenagem & Fundação",
    "Estrutura & Alvenaria",
    "Instalações (Elétrica & Hidráulica)",
    "Cobertura & Telhado",
    "Acabamentos & Revestimentos",
    "Pintura & Esquadrias",
    "Área Externa & Paisagismo",
    "Limpeza & Vistoria Final",
  ];
  const stageBudgets = stages.map((stage, idx) => ({
    id: `stage-${idx}`,
    stage,
    budgetLimit: 30000,
    orderIndex: idx,
  }));

  const projectSettings = {
    id: "default",
    projectName: "Residência • Controle de Obra",
    officialPixKey: "obra.residencial@pix.com.br",
    pixReceiverName: "Ikaro (Administrador)",
    updatedAt: new Date("2026-09-01T10:00:00.000Z"),
  };

  const inv1 = "cccc1111-1111-4111-8111-111111111111";
  const inv2 = "cccc2222-2222-4222-8222-222222222222";
  const inv3 = "cccc3333-3333-4333-8333-333333333333";
  const inv4 = "cccc4444-4444-4444-8444-444444444444";

  const invoices = [
    {
      id: inv1,
      documentNumber: "NF-004819",
      supplier: "Engemix Concreto & Aço",
      date: new Date("2026-09-18T12:00:00.000Z"),
      categoryId: catFundacao,
      installments: 3,
      pixKey: "obra.residencial@pix.com.br",
      paidBy: "Ikaro (Administrador)",
      observations: "Concretagem inicial",
    },
    {
      id: inv2,
      documentNumber: "NF-009142",
      supplier: "Obramax Atacado da Construção",
      date: new Date("2026-10-04T12:00:00.000Z"),
      categoryId: catAlvenaria,
      installments: 2,
      pixKey: "obra.residencial@pix.com.br",
      paidBy: "Ikaro (Administrador)",
      observations: "Blocos estruturais",
    },
    {
      id: inv3,
      documentNumber: "NF-011508",
      supplier: "Tigre / Hidrotécnica Materiais",
      date: new Date("2026-10-15T12:00:00.000Z"),
      categoryId: catHidraulica,
      installments: 4,
      pixKey: "obra.residencial@pix.com.br",
      paidBy: "Ikaro (Administrador)",
      observations: "Tubulação",
    },
    {
      id: inv4,
      documentNumber: "NF-012890",
      supplier: "Portobello Shop / Leroy Merlin",
      date: new Date("2026-10-22T12:00:00.000Z"),
      categoryId: catAcabamento,
      installments: 6,
      pixKey: "obra.residencial@pix.com.br",
      paidBy: "Mariana Silva (Participante)",
      observations: "Porcelanato",
    },
  ];

  const item1 = "dddd1111-1111-4111-8111-111111111111";
  const item2 = "dddd2222-2222-4222-8222-222222222222";
  const invoiceItems = [
    {
      id: item1,
      invoiceId: inv1,
      description: "Concreto Usinado FCK 30MPa",
      unit: "m³",
      quantity: 18,
      totalValue: 10800,
      stage: "Terraplenagem & Fundação",
      splitModel: "50/50",
    },
    {
      id: item2,
      invoiceId: inv2,
      description: "Blocos Cerâmicos",
      unit: "un",
      quantity: 1000,
      totalValue: 5000,
      stage: "Estrutura & Alvenaria",
      splitModel: "50/50",
    },
  ];

  const itemSplits = [
    {
      id: "split-1",
      invoiceItemId: item1,
      userId: marianaId,
      amountDue: 5400,
      status: "PENDING",
      paidAt: null,
      paymentNote: null,
    },
    {
      id: "split-2",
      invoiceItemId: item1,
      userId: carlosId,
      amountDue: 5400,
      status: "PENDING",
      paidAt: null,
      paymentNote: null,
    },
    {
      id: "split-3",
      invoiceItemId: item2,
      userId: marianaId,
      amountDue: 2500,
      status: "PAID",
      paidAt: new Date("2026-10-05T10:00:00.000Z"),
      paymentNote: "Quitado",
    },
    {
      id: "split-4",
      invoiceItemId: item2,
      userId: carlosId,
      amountDue: 2500,
      status: "PENDING",
      paidAt: null,
      paymentNote: null,
    },
  ];

  return {
    users,
    categories,
    stageBudgets,
    projectSettings,
    invoices,
    invoiceItems,
    itemSplits,
  };
}

export function createMockPrisma() {
  let state = buildDefaultTestState();

  const reset = (customState?: TestState) => {
    state = customState ?? buildDefaultTestState();
  };

  const snapshot = (): TestState => JSON.parse(JSON.stringify(state));
  const restore = (saved: TestState) => {
    state = JSON.parse(JSON.stringify(saved));
  };

  const client: any = {
    $reset: reset,
    $snapshot: snapshot,
    $restore: restore,
    $disconnect: async () => {},
    $transaction: async (arg: any) => {
      if (typeof arg === "function") {
        return arg(client);
      }
      return Promise.all(arg);
    },

    user: {
      findUnique: async ({ where }: any) => {
        if (where.email) {
          return state.users.find((u) => u.email.toLowerCase() === where.email.toLowerCase()) ?? null;
        }
        if (where.id) {
          return state.users.find((u) => u.id === where.id) ?? null;
        }
        return null;
      },
      findMany: async ({ include, orderBy }: any = {}) => {
        let res = [...state.users];
        if (orderBy?.name === "asc") {
          res.sort((a, b) => a.name.localeCompare(b.name));
        }
        if (include?.splits) {
          return res.map((u) => ({
            ...u,
            splits: state.itemSplits.filter((s) => s.userId === u.id),
          }));
        }
        return res;
      },
      create: async ({ data }: any) => {
        const newUser = {
          id: data.id || crypto.randomUUID(),
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          role: data.role,
          avatarColor: data.avatarColor || "#C26D53",
          phone: data.phone || null,
          createdAt: new Date(),
        };
        state.users.push(newUser);
        return newUser;
      },
      delete: async ({ where }: any) => {
        const idx = state.users.findIndex((u) => u.id === where.id);
        if (idx >= 0) {
          const removed = state.users.splice(idx, 1)[0];
          return removed;
        }
        throw new Error("User not found");
      },
      update: async ({ where, data }: any) => {
        const u = state.users.find((x) => x.id === where.id);
        if (!u) throw new Error("User not found");
        Object.assign(u, data);
        return u;
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = await client.user.findUnique({ where });
        if (existing) {
          return client.user.update({ where: { id: existing.id }, data: update });
        }
        return client.user.create({ data: create });
      },
    },

    category: {
      findUnique: async ({ where }: any) => {
        if (where.name) return state.categories.find((c) => c.name === where.name) ?? null;
        if (where.id) return state.categories.find((c) => c.id === where.id) ?? null;
        return null;
      },
      findMany: async ({ orderBy }: any = {}) => {
        const res = [...state.categories];
        if (orderBy?.name === "asc") res.sort((a, b) => a.name.localeCompare(b.name));
        return res;
      },
      create: async ({ data }: any) => {
        const newCat = {
          id: data.id || crypto.randomUUID(),
          name: data.name,
          description: data.description || null,
          budgetLimit: data.budgetLimit ? Number(data.budgetLimit) : null,
          createdAt: new Date(),
        };
        state.categories.push(newCat);
        return newCat;
      },
      upsert: async ({ where, update, create }: any) => {
        const existing = await client.category.findUnique({ where });
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        return client.category.create({ data: create });
      },
    },

    stageBudget: {
      findMany: async ({ orderBy }: any = {}) => {
        const res = [...state.stageBudgets];
        if (orderBy?.orderIndex === "asc") res.sort((a, b) => a.orderIndex - b.orderIndex);
        return res;
      },
      count: async () => state.stageBudgets.length,
      upsert: async ({ where, update, create }: any) => {
        const sb = state.stageBudgets.find((s) => s.stage === where.stage);
        if (sb) {
          Object.assign(sb, update);
          return sb;
        }
        const created = {
          id: create.id || crypto.randomUUID(),
          stage: create.stage,
          budgetLimit: Number(create.budgetLimit),
          orderIndex: create.orderIndex ?? state.stageBudgets.length,
        };
        state.stageBudgets.push(created);
        return created;
      },
    },

    projectSettings: {
      findUnique: async ({ where }: any) => {
        if (state.projectSettings?.id === where.id) return state.projectSettings;
        return null;
      },
      create: async ({ data }: any) => {
        state.projectSettings = {
          ...data,
          updatedAt: new Date(),
        };
        return state.projectSettings;
      },
      upsert: async ({ where, update, create }: any) => {
        if (state.projectSettings) {
          Object.assign(state.projectSettings, update, { updatedAt: new Date() });
          return state.projectSettings;
        }
        return client.projectSettings.create({ data: create });
      },
    },

    invoice: {
      findUnique: async ({ where }: any) => {
        return state.invoices.find((i) => i.id === where.id) ?? null;
      },
      findMany: async ({ include, orderBy, where }: any = {}) => {
        let res = [...state.invoices];
        if (where?.items?.some) {
          const matchingItemInvoices = new Set(
            state.invoiceItems
              .filter((it) => {
                const splits = state.itemSplits.filter((s) => s.invoiceItemId === it.id);
                return splits.some((s) => s.status === "PENDING");
              })
              .map((it) => it.invoiceId)
          );
          res = res.filter((inv) => matchingItemInvoices.has(inv.id));
        }
        if (orderBy?.date === "desc") {
          res.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        if (include) {
          return res.map((inv) => {
            const category = state.categories.find((c) => c.id === inv.categoryId) ?? null;
            let items: any[] = [];
            if (include.items) {
              const rawItems = state.invoiceItems.filter((it) => it.invoiceId === inv.id);
              items = rawItems.map((it) => {
                let splits: any[] = [];
                if (include.items.include?.splits) {
                  const rawSplits = state.itemSplits.filter((s) => s.invoiceItemId === it.id);
                  splits = rawSplits.map((s) => {
                    const user = state.users.find((u) => u.id === s.userId) ?? null;
                    return { ...s, user };
                  });
                }
                return { ...it, splits };
              });
            }
            return { ...inv, category, items };
          });
        }
        return res;
      },
      create: async ({ data }: any) => {
        const newInvoice = {
          id: data.id || crypto.randomUUID(),
          documentNumber: data.documentNumber,
          supplier: data.supplier,
          date: data.date instanceof Date ? data.date : new Date(data.date),
          categoryId: data.categoryId,
          installments: data.installments,
          pixKey: data.pixKey,
          paidBy: data.paidBy,
          observations: data.observations || null,
        };
        state.invoices.push(newInvoice);
        return newInvoice;
      },
      delete: async ({ where }: any) => {
        const idx = state.invoices.findIndex((i) => i.id === where.id);
        if (idx >= 0) {
          const removed = state.invoices.splice(idx, 1)[0];
          // cascade delete items and splits
          const itemIds = new Set(
            state.invoiceItems.filter((it) => it.invoiceId === where.id).map((it) => it.id)
          );
          state.invoiceItems = state.invoiceItems.filter((it) => it.invoiceId !== where.id);
          state.itemSplits = state.itemSplits.filter((s) => !itemIds.has(s.invoiceItemId));
          return removed;
        }
        throw new Error("Invoice not found");
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const inv of state.invoices) {
          if (!where?.id?.in || where.id.in.includes(inv.id)) {
            Object.assign(inv, data);
            count++;
          }
        }
        return { count };
      },
    },

    invoiceItem: {
      create: async ({ data }: any) => {
        const newItem = {
          id: data.id || crypto.randomUUID(),
          invoiceId: data.invoiceId,
          description: data.description,
          unit: data.unit,
          quantity: data.quantity,
          totalValue: Number(data.totalValue),
          stage: data.stage,
          splitModel: data.splitModel,
        };
        state.invoiceItems.push(newItem);
        return newItem;
      },
    },

    itemSplit: {
      findUnique: async ({ where }: any) => {
        return state.itemSplits.find((s) => s.id === where.id) ?? null;
      },
      findMany: async ({ where, include, orderBy }: any = {}) => {
        let res = state.itemSplits.filter((s) => {
          if (where?.userId && s.userId !== where.userId) return false;
          if (where?.status && s.status !== where.status) return false;
          return true;
        });
        if (include?.invoiceItem) {
          return res.map((s) => {
            const invoiceItem = state.invoiceItems.find((it) => it.id === s.invoiceItemId);
            let populatedItem = invoiceItem;
            if (invoiceItem && include.invoiceItem.include?.invoice) {
              const invoice = state.invoices.find((inv) => inv.id === invoiceItem.invoiceId);
              let populatedInvoice = invoice;
              if (invoice && include.invoiceItem.include.invoice.include?.category) {
                const category = state.categories.find((c) => c.id === invoice.categoryId);
                populatedInvoice = { ...invoice, category };
              }
              populatedItem = { ...invoiceItem, invoice: populatedInvoice };
            }
            return { ...s, invoiceItem: populatedItem };
          });
        }
        return res;
      },
      create: async ({ data }: any) => {
        const newSplit = {
          id: data.id || crypto.randomUUID(),
          invoiceItemId: data.invoiceItemId,
          userId: data.userId,
          amountDue: Number(data.amountDue),
          status: data.status,
          paidAt: data.paidAt ? (data.paidAt instanceof Date ? data.paidAt : new Date(data.paidAt)) : null,
          paymentNote: data.paymentNote || null,
        };
        state.itemSplits.push(newSplit);
        return newSplit;
      },
      update: async ({ where, data }: any) => {
        const s = state.itemSplits.find((x) => x.id === where.id);
        if (!s) throw new Error("ItemSplit not found");
        Object.assign(s, data);
        return s;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const s of state.itemSplits) {
          if (where.userId && s.userId !== where.userId) continue;
          if (where.status && s.status !== where.status) continue;
          Object.assign(s, data);
          count++;
        }
        return { count };
      },
      count: async ({ where }: any = {}) => {
        let res = state.itemSplits;
        if (where?.userId) {
          res = res.filter((s) => s.userId === where.userId);
        }
        return res.length;
      },
    },
  };

  return client;
}
