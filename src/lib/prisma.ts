// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaInstance: PrismaClient | undefined;
  prisma: PrismaClient | undefined;
};

function getActiveClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  if (!globalForPrisma.prismaInstance) {
    globalForPrisma.prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
    });
  }
  return globalForPrisma.prismaInstance;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const active = getActiveClient();
    const value = (active as any)[prop];
    if (typeof value === "function") {
      return value.bind(active);
    }
    return value;
  },
});

