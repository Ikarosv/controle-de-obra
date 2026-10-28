// src/app/admin/error.tsx
"use client";

import GlobalError from "@/app/error";

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <GlobalError {...props} />;
}
