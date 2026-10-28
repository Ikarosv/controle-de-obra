// prisma/seed.ts
import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "@prisma/client";
import { STAGES, DEFAULT_PIX_KEY } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("Inicializando banco de dados PostgreSQL Controle de Obra via Prisma...");

  const adminPasswordHash = bcrypt.hashSync("admin123", 10);
  const adminId = "11111111-1111-4111-8111-111111111111";

  // 1. Administrador Inicial da Obra
  await prisma.user.upsert({
    where: { email: "admin@obra.com" },
    update: {
      name: "Ikaro (Administrador)",
      role: "ADMIN",
      avatarColor: "#292524",
      phone: "(11) 99876-5432",
    },
    create: {
      id: adminId,
      name: "Ikaro (Administrador)",
      email: "admin@obra.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      avatarColor: "#292524",
      phone: "(11) 99876-5432",
    },
  });

  // 2. Configurações Globais da Obra
  await prisma.projectSettings.upsert({
    where: { id: "default" },
    update: {
      projectName: "Residência • Controle de Obra",
      officialPixKey: DEFAULT_PIX_KEY,
      pixReceiverName: "Ikaro (Administrador)",
    },
    create: {
      id: "default",
      projectName: "Residência • Controle de Obra",
      officialPixKey: DEFAULT_PIX_KEY,
      pixReceiverName: "Ikaro (Administrador)",
    },
  });

  // 3. Categorias Canônicas de Construção
  const categories = [
    {
      id: "aaaa6666-6666-4666-8666-666666666666",
      name: "Projetos, Taxas & Engenharia",
      description: "ART, projetos arquitetônicos, estrutural e alvarás",
      budgetLimit: new Prisma.Decimal("18000.00"),
    },
    {
      id: "aaaa1111-1111-4111-8111-111111111111",
      name: "Fundação & Concreto Usinado",
      description: "Brocas, sapatas, vigas baldrame, aço e impermeabilização",
      budgetLimit: new Prisma.Decimal("45000.00"),
    },
    {
      id: "aaaa2222-2222-4222-8222-222222222222",
      name: "Alvenaria & Estrutura",
      description: "Blocos cerâmicos, cimento, areia, brita e lajes",
      budgetLimit: new Prisma.Decimal("60000.00"),
    },
    {
      id: "aaaa3333-3333-4333-8333-333333333333",
      name: "Hidráulica & Esgoto",
      description: "Tubos PVC, conexões, caixas d'água e registros",
      budgetLimit: new Prisma.Decimal("22000.00"),
    },
    {
      id: "aaaa4444-4444-4444-8444-444444444444",
      name: "Elétrica & Iluminação",
      description: "Cabos flexíveis, quadro de distribuição, disjuntores e conduítes",
      budgetLimit: new Prisma.Decimal("25000.00"),
    },
    {
      id: "aaaa5555-5555-4555-8555-555555555555",
      name: "Revestimentos, Porcelanato & Louças",
      description: "Pisos, argamassa AC-III, bancadas em granito e metais",
      budgetLimit: new Prisma.Decimal("55000.00"),
    },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: {
        description: c.description,
        budgetLimit: c.budgetLimit,
      },
      create: c,
    });
  }

  // 4. Metas por Etapa da Obra
  const defaultBudgets = [18000, 48000, 62000, 28000, 35000, 45000, 38000, 32000];
  for (let idx = 0; idx < STAGES.length; idx++) {
    const stage = STAGES[idx];
    const budgetLimit = new Prisma.Decimal((defaultBudgets[idx] ?? 30000).toFixed(2));
    await prisma.stageBudget.upsert({
      where: { stage },
      update: { budgetLimit, orderIndex: idx },
      create: {
        stage,
        budgetLimit,
        orderIndex: idx,
      },
    });
  }

  console.log("Sincronização PostgreSQL concluída com sucesso! Banco pronto para uso.");
}

main()
  .catch((e) => {
    console.error("Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
