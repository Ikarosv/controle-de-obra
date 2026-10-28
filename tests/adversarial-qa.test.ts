// tests/adversarial-qa.test.ts
process.env.ALLOW_QA_TEST_ACTOR = "true";

import { createMockPrisma } from "./mock-prisma";
const mockPrisma = createMockPrisma();
(globalThis as any).prisma = mockPrisma;

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import {
  toCents,
  fromCents,
  calculateSplitsDifferenceInCents,
  isSplitSumExact,
  calculatePresetSplits,
  type SplitParticipantInput,
} from "../src/lib/split-calculator";
import {
  createInvoiceSchema,
  createUserSchema,
  updateProjectSettingsSchema,
  changeOwnPasswordSchema,
  adminResetPasswordSchema,
  reportPaymentNoticeSchema,
} from "../src/lib/validations/invoice";
import {
  getAllUsers,
  getHydratedInvoices,
  getParticipantSplits,
  getProjectSettings,
  findUserByEmail,
} from "../src/lib/db";
import {
  createUserAction,
  updateProjectSettingsAction,
  changeOwnPasswordAction,
  adminResetUserPasswordAction,
  deleteUserAction,
  reportSplitPaymentNoticeAction,
  reportAllPendingSplitsNoticeAction,
  type SessionActor,
} from "../src/actions/invoice-actions";

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(id: string, name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    results.push({ id, name, passed: true });
    console.log(`✅ [PASS] ${id}: ${name}`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    results.push({ id, name, passed: false, error: errorMsg });
    console.error(`❌ [FAIL] ${id}: ${name}`);
    console.error(`   ↳ ${errorMsg}`);
  }
}

async function main() {
  console.log("================================================================================");
  console.log(" 🛡️  SENIOR QA & SDET — ADVERSARIAL TEST SUITE (CONTROLE DE OBRA)");
  console.log("================================================================================\n");

  const mockUsers3: SplitParticipantInput[] = [
    { userId: "u-admin", role: "ADMIN" },
    { userId: "u-part-1", role: "PARTICIPANT" },
    { userId: "u-part-2", role: "PARTICIPANT" },
  ];

  // ==========================================================================
  // TC-01: Dízimas de Rateio, Centavos Residuais e Presets Proporcionais
  // ==========================================================================
  await runTest(
    "TC-01.1",
    "Dízima clássica: R$ 100,00 / 3 (EQUAL_ALL) -> [33.34, 33.33, 33.33] (soma exata 100.00)",
    () => {
      const splits = calculatePresetSplits(100.0, mockUsers3, "EQUAL_ALL");
      assert.equal(splits.length, 3);
      assert.deepEqual(
        splits.map((s) => s.amountDue),
        [33.34, 33.33, 33.33]
      );
      assert.equal(splits[0].status, "PAID"); // ADMIN
      assert.equal(splits[1].status, "PENDING"); // PARTICIPANT
      assert.equal(splits[2].status, "PENDING"); // PARTICIPANT
      assert.equal(isSplitSumExact(100.0, splits), true);
      assert.equal(calculateSplitsDifferenceInCents(100.0, splits), 0);
    }
  );

  await runTest(
    "TC-01.2",
    "Centavo único indivisível: R$ 0,01 / 3 (EQUAL_ALL) -> [0.01, 0.00, 0.00] (soma exata 0.01)",
    () => {
      const splits = calculatePresetSplits(0.01, mockUsers3, "EQUAL_ALL");
      assert.deepEqual(
        splits.map((s) => s.amountDue),
        [0.01, 0.0, 0.0]
      );
      assert.equal(isSplitSumExact(0.01, splits), true);
      assert.equal(calculateSplitsDifferenceInCents(0.01, splits), 0);
    }
  );

  await runTest(
    "TC-01.3",
    "Dois centavos entre 3: R$ 0,02 / 3 (EQUAL_ALL) -> [0.01, 0.01, 0.00] (soma exata 0.02)",
    () => {
      const splits = calculatePresetSplits(0.02, mockUsers3, "EQUAL_ALL");
      assert.deepEqual(
        splits.map((s) => s.amountDue),
        [0.01, 0.01, 0.0]
      );
      assert.equal(isSplitSumExact(0.02, splits), true);
    }
  );

  await runTest(
    "TC-01.4",
    "Presets proporcionais exatos e ímpares (50/50, 60/40, 70/30, 100/0) em R$ 10,00 e R$ 10,01",
    () => {
      // R$ 10,00
      const s50 = calculatePresetSplits(10.0, mockUsers3, "50/50");
      assert.deepEqual(s50.map((s) => s.amountDue), [5.0, 5.0, 0.0]);
      assert.equal(isSplitSumExact(10.0, s50), true);

      const s60 = calculatePresetSplits(10.0, mockUsers3, "60/40");
      assert.deepEqual(s60.map((s) => s.amountDue), [6.0, 4.0, 0.0]);
      assert.equal(isSplitSumExact(10.0, s60), true);

      const s70 = calculatePresetSplits(10.0, mockUsers3, "70/30");
      assert.deepEqual(s70.map((s) => s.amountDue), [7.0, 3.0, 0.0]);
      assert.equal(isSplitSumExact(10.0, s70), true);

      const s100 = calculatePresetSplits(10.0, mockUsers3, "100/0", "u-part-2");
      assert.deepEqual(s100.map((s) => s.amountDue), [0.0, 0.0, 10.0]);
      assert.equal(isSplitSumExact(10.0, s100), true);

      // Valores com centavos ímpares e dízimas
      const s50Odd = calculatePresetSplits(10.01, mockUsers3, "50/50");
      assert.deepEqual(s50Odd.map((s) => s.amountDue), [5.01, 5.0, 0.0]);
      assert.equal(isSplitSumExact(10.01, s50Odd), true);

      const s60Odd = calculatePresetSplits(10.01, mockUsers3, "60/40");
      assert.deepEqual(s60Odd.map((s) => s.amountDue), [6.01, 4.0, 0.0]);
      assert.equal(isSplitSumExact(10.01, s60Odd), true);

      const s70Odd = calculatePresetSplits(10.01, mockUsers3, "70/30");
      assert.deepEqual(s70Odd.map((s) => s.amountDue), [7.01, 3.0, 0.0]);
      assert.equal(isSplitSumExact(10.01, s70Odd), true);
    }
  );

  await runTest(
    "TC-01.5",
    "Imunidade a ponto flutuante IEEE 754 (ex: 19.99 + 3.01 === 23.00 e 0.1 + 0.2 === 0.30)",
    () => {
      const sumCents = toCents(19.99) + toCents(3.01);
      assert.equal(sumCents, 2300);
      assert.equal(fromCents(sumCents), 23.0);

      const floatSum = toCents(0.1) + toCents(0.2);
      assert.equal(floatSum, 30);
      assert.equal(fromCents(floatSum), 0.3);
    }
  );

  // ==========================================================================
  // TC-02: Zero-Tolerance no Zod Schema (validations/invoice.ts)
  // ==========================================================================
  await runTest(
    "TC-02.1",
    "Rejeita divergência de -1 centavo: Item R$ 100,00 com cotas [50.00, 49.99] (soma 99.99)",
    () => {
      const payload = {
        documentNumber: "NF-TEST-001",
        supplier: "Loja Teste",
        date: "2026-10-27",
        categoryId: "aaaa1111-1111-4111-8111-111111111111",
        installments: 1,
        pixKey: "pix@obra.com",
        paidBy: "Ikaro",
        items: [
          {
            description: "Cimento",
            unit: "sc",
            quantity: 2,
            totalValue: 100.0,
            stage: "Estrutura & Alvenaria",
            splitModel: "50/50",
            splits: [
              { userId: "11111111-1111-4111-8111-111111111111", amountDue: 50.0, status: "PENDING" as const },
              { userId: "22222222-2222-4222-8222-222222222222", amountDue: 49.99, status: "PENDING" as const },
            ],
          },
        ],
      };

      const result = createInvoiceSchema.safeParse(payload);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error.issues[0].message, /diferença zero|Divergência/i);
      }
    }
  );

  await runTest(
    "TC-02.2",
    "Rejeita divergência de +1 centavo: Item R$ 100,00 com cotas [50.00, 50.01] (soma 100.01)",
    () => {
      const payload = {
        documentNumber: "NF-TEST-002",
        supplier: "Loja Teste",
        date: "2026-10-27",
        categoryId: "aaaa1111-1111-4111-8111-111111111111",
        installments: 1,
        pixKey: "pix@obra.com",
        paidBy: "Ikaro",
        items: [
          {
            description: "Cimento",
            unit: "sc",
            quantity: 2,
            totalValue: 100.0,
            stage: "Estrutura & Alvenaria",
            splitModel: "50/50",
            splits: [
              { userId: "11111111-1111-4111-8111-111111111111", amountDue: 50.0, status: "PENDING" as const },
              { userId: "22222222-2222-4222-8222-222222222222", amountDue: 50.01, status: "PENDING" as const },
            ],
          },
        ],
      };

      const result = createInvoiceSchema.safeParse(payload);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error.issues[0].message, /diferença zero|Divergência/i);
      }
    }
  );

  await runTest(
    "TC-02.3",
    "Rejeita divergência de 4 centavos (antiga brecha <= 0.05): Item R$ 100,00 com cotas [50.00, 49.96]",
    () => {
      const payload = {
        documentNumber: "NF-TEST-003",
        supplier: "Loja Teste",
        date: "2026-10-27",
        categoryId: "aaaa1111-1111-4111-8111-111111111111",
        installments: 1,
        pixKey: "pix@obra.com",
        paidBy: "Ikaro",
        items: [
          {
            description: "Areia",
            unit: "m³",
            quantity: 1,
            totalValue: 100.0,
            stage: "Estrutura & Alvenaria",
            splitModel: "50/50",
            splits: [
              { userId: "11111111-1111-4111-8111-111111111111", amountDue: 50.0, status: "PENDING" as const },
              { userId: "22222222-2222-4222-8222-222222222222", amountDue: 49.96, status: "PENDING" as const },
            ],
          },
        ],
      };

      const result = createInvoiceSchema.safeParse(payload);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error.issues[0].message, /diferença zero|Divergência/i);
      }
    }
  );

  await runTest(
    "TC-02.4",
    "Aceita rateio de dízima com centavo residual exato: Item R$ 100,00 com [33.34, 33.33, 33.33]",
    () => {
      const payload = {
        documentNumber: "NF-TEST-004",
        supplier: "Loja Teste",
        date: "2026-10-27",
        categoryId: "aaaa1111-1111-4111-8111-111111111111",
        installments: 1,
        pixKey: "pix@obra.com",
        paidBy: "Ikaro",
        items: [
          {
            description: "Tijolos",
            unit: "mil",
            quantity: 1,
            totalValue: 100.0,
            stage: "Estrutura & Alvenaria",
            splitModel: "EQUAL_ALL",
            splits: [
              { userId: "11111111-1111-4111-8111-111111111111", amountDue: 33.34, status: "PENDING" as const },
              { userId: "22222222-2222-4222-8222-222222222222", amountDue: 33.33, status: "PENDING" as const },
              { userId: "33333333-3333-4333-8333-333333333333", amountDue: 33.33, status: "PENDING" as const },
            ],
          },
        ],
      };

      const result = createInvoiceSchema.safeParse(payload);
      assert.equal(result.success, true);
    }
  );

  // ==========================================================================
  // TC-03: Payloads Maliciosos, Valores Negativos, NaN, Strings Vazias
  // ==========================================================================
  await runTest(
    "TC-03.1",
    "Rejeita valores negativos (-10) em totalValue ou em amountDue (tentativa de burlar soma com cota negativa)",
    () => {
      const payloadNegativeTotal = {
        documentNumber: "NF-NEG",
        supplier: "Fornecedor",
        date: "2026-10-27",
        categoryId: "aaaa1111-1111-4111-8111-111111111111",
        installments: 1,
        pixKey: "pix@obra.com",
        paidBy: "Ikaro",
        items: [
          {
            description: "Item Negativo",
            unit: "un",
            quantity: 1,
            totalValue: -100.0,
            stage: "Estrutura & Alvenaria",
            splitModel: "50/50",
            splits: [{ userId: "11111111-1111-4111-8111-111111111111", amountDue: -100.0, status: "PENDING" as const }],
          },
        ],
      };
      assert.equal(createInvoiceSchema.safeParse(payloadNegativeTotal).success, false);

      const payloadNegativeSplit = {
        documentNumber: "NF-SNEAKY",
        supplier: "Fornecedor",
        date: "2026-10-27",
        categoryId: "aaaa1111-1111-4111-8111-111111111111",
        installments: 1,
        pixKey: "pix@obra.com",
        paidBy: "Ikaro",
        items: [
          {
            description: "Cota Maliciosa",
            unit: "un",
            quantity: 1,
            totalValue: 100.0,
            stage: "Estrutura & Alvenaria",
            splitModel: "50/50",
            splits: [
              { userId: "11111111-1111-4111-8111-111111111111", amountDue: 110.0, status: "PENDING" as const },
              { userId: "22222222-2222-4222-8222-222222222222", amountDue: -10.0, status: "PENDING" as const },
            ],
          },
        ],
      };
      assert.equal(createInvoiceSchema.safeParse(payloadNegativeSplit).success, false);
    }
  );

  await runTest(
    "TC-03.2",
    "Rejeita valor total de item igual a zero (0), NaN ou Infinity",
    () => {
      const basePayload = {
        documentNumber: "NF-ZERO",
        supplier: "Fornecedor",
        date: "2026-10-27",
        categoryId: "aaaa1111-1111-4111-8111-111111111111",
        installments: 1,
        pixKey: "pix@obra.com",
        paidBy: "Ikaro",
      };

      const payloadZero = {
        ...basePayload,
        items: [
          {
            description: "Item Grátis",
            unit: "un",
            quantity: 1,
            totalValue: 0,
            stage: "Estrutura & Alvenaria",
            splitModel: "50/50",
            splits: [],
          },
        ],
      };
      assert.equal(createInvoiceSchema.safeParse(payloadZero).success, false);

      const payloadNaN = {
        ...basePayload,
        items: [
          {
            description: "Item NaN",
            unit: "un",
            quantity: 1,
            totalValue: NaN,
            stage: "Estrutura & Alvenaria",
            splitModel: "50/50",
            splits: [],
          },
        ],
      };
      assert.equal(createInvoiceSchema.safeParse(payloadNaN).success, false);
    }
  );

  await runTest(
    "TC-03.3",
    "Rejeita parcelas inválidas (0 ou 121), strings vazias e senhas curtas (< 6 chars)",
    () => {
      const invalidUser = {
        name: "",
        email: "email-invalido",
        password: "123",
        role: "PARTICIPANT",
      };
      const userRes = createUserSchema.safeParse(invalidUser);
      assert.equal(userRes.success, false);
      assert.equal(userRes.error.issues.length >= 3, true);

      const shortPass = changeOwnPasswordSchema.safeParse({
        currentPassword: "senha",
        newPassword: "123",
      });
      assert.equal(shortPass.success, false);
    }
  );

  // ==========================================================================
  // TC-04: Persistência, Integridade Relacional, Anti-IDOR / RBAC e Privacidade
  // ==========================================================================
  await runTest(
    "TC-04.1",
    "Isolamento de Banco + Bloqueio Anti-IDOR: Participante A NÃO consegue registrar aviso de PIX em cota do Participante B",
    async () => {
      const backup = mockPrisma.$snapshot();

      try {
        const users = await mockPrisma.user.findMany();
        const admin = users.find((u: any) => u.role === "ADMIN")!;
        const participants = users.filter((u: any) => u.role === "PARTICIPANT");
        assert.ok(admin, "Admin deve existir no seed");
        assert.ok(participants.length >= 2, "Deve haver ao menos 2 participantes no seed");

        const mariana = participants[0]; // 2222...
        const carlos = participants[1]; // 3333...

        // Localiza uma cota PENDING pertencente à Mariana
        const splits = await mockPrisma.itemSplit.findMany();
        const marianaPendingSplit = splits.find(
          (s: any) => s.userId === mariana.id && s.status === "PENDING"
        );
        assert.ok(marianaPendingSplit, "Mariana deve possuir cota PENDING para o teste");

        const actorCarlos: SessionActor = {
          id: carlos.id,
          role: "PARTICIPANT",
          name: carlos.name,
          email: carlos.email,
        };

        // Tentativa de IDOR: Carlos tenta informar PIX na cota da Mariana
        const idorAttempt = await reportSplitPaymentNoticeAction(
          {
            splitId: marianaPendingSplit.id,
            note: "Tentativa maliciosa de IDOR pelo Carlos",
          },
          actorCarlos
        );

        assert.equal(
          idorAttempt.success,
          false,
          "Tentativa de IDOR deve falhar com success: false"
        );
        assert.match(idorAttempt.message, /Acesso negado/i);

        // Verifica que a cota da Mariana permaneceu intacta no banco
        const unchangedSplit = await mockPrisma.itemSplit.findUnique({
          where: { id: marianaPendingSplit.id },
        });
        assert.equal(unchangedSplit.paymentNote, null);

        // Agora a própria Mariana informa o PIX na sua cota -> deve funcionar!
        const actorMariana: SessionActor = {
          id: mariana.id,
          role: "PARTICIPANT",
          name: mariana.name,
          email: mariana.email,
        };

        const legitimateAttempt = await reportSplitPaymentNoticeAction(
          {
            splitId: marianaPendingSplit.id,
            note: "Comprovante PIX Banco Itaú 27/10",
          },
          actorMariana
        );
        assert.equal(legitimateAttempt.success, true);

        const updatedSplit = await mockPrisma.itemSplit.findUnique({
          where: { id: marianaPendingSplit.id },
        });
        assert.equal(
          updatedSplit.paymentNote,
          "PIX informado: Comprovante PIX Banco Itaú 27/10"
        );
        // Garante que participante NÃO consegue mudar o status para PAID sozinho
        assert.equal(updatedSplit.status, "PENDING");

        // Teste de aviso em lote (reportAllPendingSplitsNoticeAction): afeta APENAS cotas do actor logado
        const batchRes = await reportAllPendingSplitsNoticeAction(
          { note: "PIX Lote Carlos" },
          actorCarlos
        );
        assert.equal(batchRes.success, true);
        const carlosSplits = await mockPrisma.itemSplit.findMany({
          where: { userId: carlos.id, status: "PENDING" },
        });
        assert.ok(
          carlosSplits.every((s: any) => s.paymentNote === "PIX informado: PIX Lote Carlos")
        );
      } finally {
        mockPrisma.$restore(backup);
      }
    }
  );

  await runTest(
    "TC-04.2",
    "Integridade Relacional e RBAC: Bloqueia exclusão de participante com cotas vinculadas (splitsCount > 0), autoexclusão de Admin e ações restritas",
    async () => {
      const backup = mockPrisma.$snapshot();

      try {
        const users = await mockPrisma.user.findMany();
        const admin = users.find((u: any) => u.role === "ADMIN")!;
        const mariana = users.find((u: any) => u.email === "mariana@obra.com")!;

        const actorAdmin: SessionActor = {
          id: admin.id,
          role: "ADMIN",
          name: admin.name,
          email: admin.email,
        };
        const actorMariana: SessionActor = {
          id: mariana.id,
          role: "PARTICIPANT",
          name: mariana.name,
          email: mariana.email,
        };

        // 1. Participante tentando deletar usuário -> bloqueado por RBAC
        const rbacDel = await deleteUserAction(mariana.id, actorMariana);
        assert.equal(rbacDel.success, false);
        assert.match(rbacDel.message, /Administrador/i);

        // 2. Admin tentando deletar a própria conta -> bloqueado
        const selfDel = await deleteUserAction(admin.id, actorAdmin);
        assert.equal(selfDel.success, false);
        assert.match(selfDel.message, /própria conta/i);

        // 3. Admin tentando deletar participante que possui rateios vinculados (splitsCount > 0) -> bloqueado
        const linkedDel = await deleteUserAction(mariana.id, actorAdmin);
        assert.equal(linkedDel.success, false);
        assert.match(linkedDel.message, /cotas vinculadas/i);

        // 4. Criar um participante temporário sem cotas (splitsCount === 0) e removê-lo -> permitido
        const tempUserId = "99999999-9999-4999-8999-999999999999";
        await mockPrisma.user.create({
          data: {
            id: tempUserId,
            name: "Participante Temporário Sem Cotas",
            email: "temp@obra.com",
            passwordHash: bcrypt.hashSync("senha123", 10),
            role: "PARTICIPANT",
            avatarColor: "#78716C",
            phone: null,
          },
        });

        const cleanDel = await deleteUserAction(tempUserId, actorAdmin);
        assert.equal(cleanDel.success, true);
        const usersAfter = await mockPrisma.user.findMany();
        assert.equal(
          usersAfter.some((u: any) => u.id === tempUserId),
          false
        );
      } finally {
        mockPrisma.$restore(backup);
      }
    }
  );

  await runTest(
    "TC-04.3",
    "Gestão de Senhas e Configurações da Obra (ProjectSettings + Propagação de PIX + Troca de Senha Anti-IDOR)",
    async () => {
      const backup = mockPrisma.$snapshot();

      try {
        const users = await mockPrisma.user.findMany();
        const admin = users.find((u: any) => u.role === "ADMIN")!;
        const mariana = users.find((u: any) => u.email === "mariana@obra.com")!;

        const actorAdmin: SessionActor = {
          id: admin.id,
          role: "ADMIN",
        };
        const actorMariana: SessionActor = {
          id: mariana.id,
          role: "PARTICIPANT",
        };

        // 1. Participante NÃO pode alterar configurações da obra
        const unauthorizedSettings = await updateProjectSettingsAction(
          {
            projectName: "Obra Hackeada",
            officialPixKey: "hacker@pix.com",
            pixReceiverName: "Hacker",
          },
          actorMariana
        );
        assert.equal(unauthorizedSettings.success, false);

        // 2. Admin altera configurações da obra e propaga chave PIX para notas pendentes
        const validSettings = await updateProjectSettingsAction(
          {
            projectName: "Residência Ikaro • Fase Acabamento",
            officialPixKey: "ikaro.oficial@pix.com.br",
            pixReceiverName: "Ikaro Proprietário",
            applyToPendingInvoices: true,
          },
          actorAdmin
        );
        assert.equal(validSettings.success, true);

        const settingsNow = await getProjectSettings();
        assert.equal(settingsNow.projectName, "Residência Ikaro • Fase Acabamento");
        assert.equal(settingsNow.officialPixKey, "ikaro.oficial@pix.com.br");
        assert.equal(settingsNow.pixReceiverName, "Ikaro Proprietário");

        // 3. Troca da própria senha exige senha atual correta
        const wrongCurrentPass = await changeOwnPasswordAction(
          {
            currentPassword: "senha_errada_999",
            newPassword: "novaSenhaSegura123",
          },
          actorMariana
        );
        assert.equal(wrongCurrentPass.success, false);

        const rightCurrentPass = await changeOwnPasswordAction(
          {
            currentPassword: "obra123",
            newPassword: "novaSenhaMariana2026",
          },
          actorMariana
        );
        assert.equal(rightCurrentPass.success, true);

        const updatedMariana = await findUserByEmail("mariana@obra.com");
        assert.ok(updatedMariana);
        assert.equal(
          await bcrypt.compare("novaSenhaMariana2026", updatedMariana.passwordHash),
          true
        );

        // 4. Admin redefine senha de participante
        const resetByAdmin = await adminResetUserPasswordAction(
          {
            targetUserId: mariana.id,
            newPassword: "resetadaPeloAdmin99",
          },
          actorAdmin
        );
        assert.equal(resetByAdmin.success, true);
        const resetMariana = await findUserByEmail("mariana@obra.com");
        assert.ok(resetMariana);
        assert.equal(
          await bcrypt.compare("resetadaPeloAdmin99", resetMariana.passwordHash),
          true
        );

        // 5. Verifica que agregadores contábeis do repositório retornam somas íntegras
        const allUsers = await getAllUsers();
        const hydratedInvoices = await getHydratedInvoices();
        const marianaSplits = await getParticipantSplits(mariana.id);
        assert.ok(allUsers.length >= 3);
        assert.ok(hydratedInvoices.length >= 4);
        assert.ok(marianaSplits.length > 0);
      } finally {
        mockPrisma.$restore(backup);
      }
    }
  );

  await runTest(
    "TC-04.4",
    "Auditoria de Código-Fonte: login/page.tsx sem credenciais expostas e auth.ts sem secret de produção hardcoded",
    () => {
      const loginPagePath = path.join(
        process.cwd(),
        "src",
        "app",
        "login",
        "page.tsx"
      );
      const loginSource = fs.readFileSync(loginPagePath, "utf-8");

      assert.equal(
        loginSource.includes("admin123"),
        false,
        "login/page.tsx NÃO pode conter a senha 'admin123'"
      );
      assert.equal(
        loginSource.includes("obra123"),
        false,
        "login/page.tsx NÃO pode conter a senha 'obra123'"
      );
      assert.equal(
        loginSource.includes("fillDemoUser"),
        false,
        "login/page.tsx NÃO pode conter a função 'fillDemoUser'"
      );

      const authPath = path.join(process.cwd(), "src", "auth.ts");
      const authSource = fs.readFileSync(authPath, "utf-8");
      assert.equal(
        authSource.includes("controle-de-obra-warm-minimalism-secret-key-2026-prod"),
        false,
        "src/auth.ts NÃO pode conter o segredo de produção hardcoded antigo"
      );
      assert.equal(
        authSource.includes('process.env.NODE_ENV === "production"'),
        true,
        "src/auth.ts deve validar NODE_ENV === 'production' para exigir AUTH_SECRET"
      );
    }
  );

  await runTest(
    "TC-05.1",
    "Gestão Completa de Participantes: Criação, Duplicação de Email e RBAC",
    async () => {
      const backup = mockPrisma.$snapshot();

      try {
        const users = await mockPrisma.user.findMany();
        const admin = users.find((u: any) => u.role === "ADMIN")!;
        const mariana = users.find((u: any) => u.email === "mariana@obra.com")!;

        const actorAdmin: SessionActor = {
          id: admin.id,
          role: "ADMIN",
        };
        const actorMariana: SessionActor = {
          id: mariana.id,
          role: "PARTICIPANT",
        };

        // 1. Participante NÃO pode criar novos usuários (RBAC)
        const unauthCreate = await createUserAction(
          {
            name: "Novo Participante Malicioso",
            email: "hacker.participante@obra.com",
            password: "senhaSegura123",
            role: "PARTICIPANT",
          },
          actorMariana
        );
        assert.equal(unauthCreate.success, false);
        assert.match(unauthCreate.message, /Administrador/i);

        // 2. Admin cria novo participante com sucesso
        const validCreate = await createUserAction(
          {
            name: "Engenheiro Roberto",
            email: "roberto@obra.com",
            password: "robertoSenha123",
            role: "PARTICIPANT",
            phone: "(11) 98888-7777",
          },
          actorAdmin
        );
        assert.equal(validCreate.success, true);
        assert.match(validCreate.message, /Roberto/i);

        const created = await findUserByEmail("roberto@obra.com");
        assert.ok(created, "Usuário criado deve constar no repositório");
        assert.equal(created.name, "Engenheiro Roberto");
        assert.equal(created.phone, "(11) 98888-7777");
        assert.ok(
          bcrypt.compareSync("robertoSenha123", created.passwordHash),
          "Senha deve ser hasheada com bcrypt"
        );

        // 3. Rejeita criação com e-mail duplicado
        const duplicateCreate = await createUserAction(
          {
            name: "Roberto Clonado",
            email: "roberto@obra.com",
            password: "outraSenha123",
            role: "PARTICIPANT",
          },
          actorAdmin
        );
        assert.equal(duplicateCreate.success, false);
        assert.match(duplicateCreate.message, /Já existe um usuário/i);
      } finally {
        mockPrisma.$restore(backup);
      }
    }
  );

  await runTest(
    "TC-05.2",
    "Gestão Completa de Participantes: Exclusão com Confirmação e Validação de Cotas",
    async () => {
      const backup = mockPrisma.$snapshot();

      try {
        const users = await mockPrisma.user.findMany();
        const admin = users.find((u: any) => u.role === "ADMIN")!;
        const actorAdmin: SessionActor = {
          id: admin.id,
          role: "ADMIN",
        };

        // 1. Cria usuário temporário sem cotas
        const tempRes = await createUserAction(
          {
            name: "Temporário Excluir",
            email: "temp.del@obra.com",
            password: "senhaSegura123",
            role: "PARTICIPANT",
          },
          actorAdmin
        );
        assert.equal(tempRes.success, true);

        const tempUser = await findUserByEmail("temp.del@obra.com");
        assert.ok(tempUser);

        // 2. Remove o usuário temporário com sucesso
        const delRes = await deleteUserAction(tempUser.id, actorAdmin);
        assert.equal(delRes.success, true);
        assert.match(delRes.message, /removido com sucesso/i);

        const deletedCheck = await findUserByEmail("temp.del@obra.com");
        assert.equal(deletedCheck, null, "Usuário excluído não pode mais constar no banco");
      } finally {
        mockPrisma.$restore(backup);
      }
    }
  );

  console.log("\n================================================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(
    `📊 RESUMO FINAL DA SUÍTE ADVERSÁRIA: ${passedCount}/${results.length} TESTES APROVADOS (${failedCount} FALHAS)`
  );
  console.log("================================================================================");

  if (failedCount > 0) {
    console.error("\n🚨 STATUS DO GATEKEEPER: QA_BLOCKED");
    process.exit(1);
  } else {
    console.log("\n✅ STATUS DO GATEKEEPER: APPROVED_BY_QA");
  }
}

main().catch((err) => {
  console.error("Erro fatal na execução da suíte de testes:", err);
  process.exit(1);
});
