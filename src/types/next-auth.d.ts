// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "PARTICIPANT";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ADMIN" | "PARTICIPANT";
  }
}
