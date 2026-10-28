// src/app/error.tsx
"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Application Error Boundary]:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-4 py-12 text-[#1C1917]">
      <div className="w-full max-w-lg rounded-3xl border border-[#E6E1DA] bg-white p-8 text-center shadow-[0_12px_32px_-8px_rgba(28,25,23,0.06)] md:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C26D53]/12 text-[#C26D53]">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <span className="mt-5 block text-xs font-medium uppercase tracking-widest text-[#78716C]">
          Proteção de Interface
        </span>
        <h2 className="mt-1 font-display text-2xl font-semibold text-[#1C1917]">
          Algo inesperado aconteceu
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#78716C]">
          {error.message ||
            "Não foi possível carregar os dados desta seção no momento. Seus lançamentos no banco de dados permanecem intactos."}
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#292524] px-6 py-3 text-xs font-semibold text-[#FAF8F5] transition-colors hover:bg-[#1C1917]"
          >
            <RotateCcw className="h-4 w-4" />
            Tentar Novamente
          </button>
        </div>
      </div>
    </div>
  );
}
