// prisma/seed.ts
import bcrypt from "bcryptjs";
import { PrismaClient, Prisma } from "@prisma/client";
import { readLocalStore } from "../src/lib/db";

const prisma = new PrismaClient();

async function main() {
  console.log("Inicializando banco de dados Controle de Obra...");

  // 1. Garante que o store local relacional (.data/controle-obra-db.json) esteja populado
  const store = readLocalStore();
  console.log(
    `Store local verificado: ${store.users.length} usuários, ${store.categories.length} categorias, ${store.invoices.length} notas fiscais.`
  );

  // 2. Se houver um banco PostgreSQL ativo (Vercel Postgres / Supabase / Docker), popula via Prisma
  try {
    for (const u of store.users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          role: u.role,
          avatarColor: u.avatarColor,
          phone: u.phone,
        },
      });
    }

    for (const c of store.categories) {
      await prisma.category.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          name: c.name,
          description: c.description,
          budgetLimit: c.budgetLimit ? new Prisma.Decimal(c.budgetLimit) : null,
        },
      });
    }

    const defaultSettings = store.projectSettings || store.settings;
    if (defaultSettings) {
      await prisma.projectSettings.upsert({
        where: { id: "default" },
        update: {},
        create: {
          id: "default",
          projectName: defaultSettings.projectName,
          officialPixKey: defaultSettings.officialPixKey,
          pixReceiverName: defaultSettings.pixReceiverName,
        },
      });
    }

    for (const st of store.stageBudgets) {
      await prisma.stageBudget.upsert({
        where: { stage: st.stage },
        update: { budgetLimit: new Prisma.Decimal(st.budgetLimit) },
        create: {
          stage: st.stage,
          budgetLimit: new Prisma.Decimal(st.budgetLimit),
          orderIndex: st.orderIndex,
        },
      });
    }

    console.log("Sincronização PostgreSQL concluída com sucesso!");
  } catch (err) {
    console.log(
      "PostgreSQL remoto não detectado ou erro na sincronização:",
      err
    );
  } finally {
    await prisma.$disconnect();
  }
}

main();
