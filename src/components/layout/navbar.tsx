// src/components/layout/navbar.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  UserCheck,
  LogOut,
  ShieldCheck,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { logoutAction, changeOwnPasswordAction } from "@/actions/invoice-actions";

interface NavbarProps {
  projectName?: string;
  user: {
    name?: string | null;
    email?: string | null;
    role: "ADMIN" | "PARTICIPANT";
  };
}

export function Navbar({
  projectName = "Residência • Controle de Obra",
  user,
}: NavbarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const openModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFeedback(null);
    setIsPasswordModalOpen(true);
  };

  const closeModal = () => {
    setIsPasswordModalOpen(false);
    setFeedback(null);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword.length < 6) {
      setFeedback({
        type: "error",
        text: "A nova senha deve ter no mínimo 6 caracteres.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: "error",
        text: "A confirmação da nova senha não confere.",
      });
      return;
    }

    startTransition(async () => {
      const res = await changeOwnPasswordAction({
        currentPassword,
        newPassword,
      });

      setFeedback({
        type: res.success ? "success" : "error",
        text: res.message,
      });

      if (res.success) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  return (
    <>
      <header className="no-print sticky top-0 z-40 border-b border-[#E6E1DA] bg-[#FAF8F5]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-10">
          {/* Identidade da Obra */}
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#292524] text-[#FAF8F5] shadow-xs">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-semibold tracking-tight text-[#1C1917]">
                  {projectName}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                    isAdmin
                      ? "bg-[#292524] text-[#FAF8F5]"
                      : "bg-[#C26D53]/15 text-[#9A4B34]"
                  }`}
                >
                  {isAdmin ? "Administrador" : "Participante"}
                </span>
              </div>
              <p className="text-xs text-[#78716C]">
                Gestão Financeira, Notas Fiscais e Rateio por Item
              </p>
            </div>
          </div>

          {/* Navegação Contextual */}
          <div className="flex items-center gap-3">
            {isAdmin && (
              <nav
                aria-label="Navegação do Administrador"
                className="hidden items-center gap-1 rounded-2xl border border-[#E6E1DA] bg-[#F3EFEA] p-1 md:flex"
              >
                <Link
                  href="/admin"
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                    pathname.startsWith("/admin")
                      ? "bg-white text-[#1C1917] shadow-xs"
                      : "text-[#78716C] hover:text-[#1C1917]"
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                  Painel Admin & Notas
                </Link>
                <Link
                  href="/meu-painel"
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                    pathname.startsWith("/meu-painel")
                      ? "bg-white text-[#1C1917] shadow-xs"
                      : "text-[#78716C] hover:text-[#1C1917]"
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Visão do Participante
                </Link>
              </nav>
            )}

            {/* Usuário Logado, Alterar Senha & Logout */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#E6E1DA] bg-white px-3.5 py-2 shadow-2xs">
              <div className="hidden text-right sm:block">
                <p className="flex items-center justify-end gap-1 text-xs font-semibold text-[#1C1917]">
                  {isAdmin && (
                    <ShieldCheck
                      className="h-3.5 w-3.5 text-[#4D6B53]"
                      aria-hidden="true"
                    />
                  )}
                  {user.name}
                </p>
                <p className="text-[11px] text-[#78716C]">{user.email}</p>
              </div>

              <button
                type="button"
                onClick={openModal}
                title="Alterar minha senha de acesso"
                className="flex items-center gap-1.5 rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-[#1C1917] transition-colors hover:bg-[#F3EFEA] focus-visible:ring-2 focus-visible:ring-[#292524] focus-visible:outline-none"
              >
                <KeyRound className="h-3.5 w-3.5 text-[#78716C]" aria-hidden="true" />
                <span className="hidden lg:inline">Alterar Senha</span>
              </button>

              <form action={logoutAction}>
                <button
                  type="submit"
                  title="Sair do sistema"
                  className="flex items-center gap-1.5 rounded-xl bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-[#78716C] transition-colors hover:bg-[#C26D53]/15 hover:text-[#9A4B34] focus-visible:ring-2 focus-visible:ring-[#C26D53] focus-visible:outline-none"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Troca da Própria Senha (WCAG AA) */}
      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/50 px-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") closeModal();
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-[#E6E1DA] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(28,25,23,0.18)] sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-[#E6E1DA] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF8F5] text-[#292524]">
                  <KeyRound className="h-4 w-4 text-[#C26D53]" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="change-password-title"
                    className="font-display text-lg font-semibold text-[#1C1917]"
                  >
                    Alterar Minha Senha
                  </h2>
                  <p className="text-xs text-[#78716C]">
                    Conta: <strong>{user.email}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Fechar janela de alteração de senha"
                className="rounded-xl p-1.5 text-[#78716C] transition-colors hover:bg-[#FAF8F5] hover:text-[#1C1917]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {feedback && (
              <div
                role="alert"
                className={`mt-5 flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-xs font-medium ${
                  feedback.type === "success"
                    ? "border-[#4D6B53]/30 bg-[#4D6B53]/10 text-[#364D3B]"
                    : "border-[#C26D53]/30 bg-[#C26D53]/10 text-[#9A4B34]"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4D6B53]" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#C26D53]" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#78716C]"
                >
                  Senha Atual
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Informe sua senha atual"
                  className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917] focus:border-[#292524] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#78716C]"
                >
                  Nova Senha (mín. 6 caracteres)
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha segura"
                  className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917] focus:border-[#292524] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#78716C]"
                >
                  Confirmar Nova Senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1917] focus:border-[#292524] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-[#E6E1DA] pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[#78716C] transition-colors hover:bg-[#FAF8F5] hover:text-[#1C1917]"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#292524] px-5 py-2.5 text-xs font-semibold text-[#FAF8F5] transition-colors hover:bg-[#1C1917] disabled:opacity-60"
                >
                  {isPending ? "Salvando..." : "Atualizar Senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
