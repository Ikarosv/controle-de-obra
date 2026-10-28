// src/app/meu-painel/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getParticipantSplits,
  getAllUsers,
  getProjectSettings,
} from "@/lib/db";
import { Navbar } from "@/components/layout/navbar";
import { ParticipantDashboard } from "@/components/participant/participant-dashboard";
import { DEFAULT_PIX_KEY } from "@/lib/constants";
import { toCents, fromCents } from "@/lib/split-calculator";

export const metadata = {
  title: "Meu Painel de Rateio | Controle de Obra",
};

export default async function ParticipantPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const isAdmin = session.user.role === "ADMIN";
  const [allUsers, projectSettings] = await Promise.all([
    getAllUsers(),
    getProjectSettings(),
  ]);

  // Permite que o Administrador visualize o painel de qualquer participante para conferência
  const targetUserId =
    isAdmin && params.userId
      ? params.userId
      : isAdmin
      ? allUsers.find((u) => u.role === "PARTICIPANT")?.id || session.user.id
      : session.user.id;

  const targetUser =
    allUsers.find((u) => u.id === targetUserId) || {
      id: session.user.id,
      name: session.user.name || "Participante",
      email: session.user.email || "",
      role: session.user.role,
    };

  const splits = await getParticipantSplits(targetUserId);

  const totalPending = fromCents(
    splits
      .filter((s) => s.status === "PENDING")
      .reduce((acc, curr) => acc + toCents(curr.amountDue), 0)
  );

  const totalPaid = fromCents(
    splits
      .filter((s) => s.status === "PAID")
      .reduce((acc, curr) => acc + toCents(curr.amountDue), 0)
  );

  const primaryPixKey =
    projectSettings.officialPixKey ||
    splits.find((s) => s.status === "PENDING")?.invoice.pixKey ||
    splits[0]?.invoice.pixKey ||
    DEFAULT_PIX_KEY;

  const isSimulatingOtherUser = targetUserId !== session.user.id;

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
        <ParticipantDashboard
          userName={targetUser.name}
          userEmail={targetUser.email}
          isAdminViewer={isAdmin}
          isSimulatingOtherUser={isSimulatingOtherUser}
          selectedUserId={targetUserId}
          availableUsers={allUsers.map((u) => ({
            id: u.id,
            name: u.name,
            role: u.role,
          }))}
          splits={splits}
          totalPending={totalPending}
          totalPaid={totalPaid}
          primaryPixKey={primaryPixKey}
          projectSettings={projectSettings}
        />
      </main>
    </div>
  );
}
