// src/app/meu-painel/error.tsx
"use client";

import GlobalError from "@/app/error";

export default function ParticipantError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <GlobalError {...props} />;
}
