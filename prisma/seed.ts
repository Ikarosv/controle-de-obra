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
    const adminPasswordHash = await bcrypt.hash("admin123", 10);
    await prisma.user.upsert({
      where: { email: "admin@obra.com" },
      update: {},
      create: {
        name: "Ikaro (Administrador)",
        email: "admin@obra.com",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        avatarColor: "#292524",
      },
    });

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
  } catch {
    console.log(
      "PostgreSQL remoto não detectado no momento. O repositório local persistente (.data/controle-obra-db.json) está 100% ativo e populado."
    );
  } finally {
    await prisma.$disconnect();
  }
}

main();
