// src/app/login/page.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { authenticateAction } from "@/actions/invoice-actions";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await authenticateAction(email, password);
      if (res.success && res.redirectUrl) {
        router.push(res.redirectUrl);
        router.refresh();
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  return (
    <main className="flex min-h-screen flex-col justify-center bg-[#FAF8F5] px-4 py-12 text-[#1C1917] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        {/* Identidade Warm Minimalism */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#292524] text-[#FAF8F5] shadow-md">
            <Building2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <span className="mt-5 block text-xs font-semibold uppercase tracking-widest text-[#78716C]">
            Sistema Privado • Gestão Residencial
          </span>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-[#1C1917]">
            Controle de Obra
          </h1>
          <p className="mt-2 text-sm text-[#78716C]">
            Gerenciamento de notas fiscais, orçamento por etapas e rateio detalhado item a item.
          </p>
        </div>

        {/* Card de Login */}
        <div className="mt-8 rounded-3xl border border-[#E6E1DA] bg-white p-8 shadow-[0_16px_40px_-10px_rgba(28,25,23,0.06)] sm:p-10">
          {errorMessage && (
            <div
              id="login-error"
              role="alert"
              aria-live="assertive"
              className="mb-6 rounded-2xl border border-[#C26D53]/30 bg-[#C26D53]/10 px-4 py-3 text-xs font-medium text-[#9A4B34]"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#78716C]"
              >
                E-mail Cadastrado
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-3.5 left-4 h-4 w-4 text-[#A8A29E]"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(errorMessage)}
                  aria-describedby={errorMessage ? "login-error" : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] py-3 pr-4 pl-11 text-sm text-[#1C1917] transition-colors focus:border-[#292524] focus:bg-white focus:ring-2 focus:ring-[#292524]/15 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#78716C]"
              >
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute top-3.5 left-4 h-4 w-4 text-[#A8A29E]"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-invalid={Boolean(errorMessage)}
                  aria-describedby={errorMessage ? "login-error" : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#E6E1DA] bg-[#FAF8F5] py-3 pr-4 pl-11 text-sm text-[#1C1917] transition-colors focus:border-[#292524] focus:bg-white focus:ring-2 focus:ring-[#292524]/15 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#292524] px-6 py-3.5 text-sm font-medium text-[#FAF8F5] transition-all hover:bg-[#1C1917] focus-visible:ring-2 focus-visible:ring-[#292524] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{isPending ? "Autenticando..." : "Acessar Painel da Obra"}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          {/* Rodapé de Sistema Fechado */}
          <div className="mt-7 border-t border-[#E6E1DA] pt-5">
            <div className="flex items-start gap-2.5 rounded-2xl bg-[#FAF8F5] px-4 py-3 text-xs leading-relaxed text-[#78716C]">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-[#4D6B53]"
                aria-hidden="true"
              />
              <p>
                Acesso restrito aos participantes cadastrados na obra. Solicite suas credenciais ou redefinição de senha ao administrador.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
