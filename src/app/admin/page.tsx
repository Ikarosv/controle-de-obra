// src/app/admin/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getHydratedInvoices,
  getAllUsers,
  getAllCategories,
  getAllStageBudgets,
  getProjectSettings,
} from "@/lib/db";
import { Navbar } from "@/components/layout/navbar";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "Painel do Administrador | Controle de Obra",
};

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/meu-painel");
  }

  const [invoices, users, categories, stageBudgets, projectSettings] =
    await Promise.all([
      getHydratedInvoices(),
      getAllUsers(),
      getAllCategories(),
      getAllStageBudgets(),
      getProjectSettings(),
    ]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917]">
      <Navbar
        projectName={projectSettings.projectName}
        user={{
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }}
      />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-10 md:py-12">
        <AdminDashboard
          invoices={invoices}
          users={users}
          categories={categories}
          stageBudgets={stageBudgets}
          projectSettings={projectSettings}
          currentAdminId={session.user.id}
        />
      </main>
    </div>
  );
}
