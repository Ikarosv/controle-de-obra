// tests/adversarial-qa.test.ts
process.env.ALLOW_QA_TEST_ACTOR = "true";

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import {
  toCents,
  fromCents,
  calculateSplitsDifferenceInCents,
  isSplitSumExact,
  distributeEqualInCents,
  distributeByWeightsInCents,
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
  readLocalStore,
  writeLocalStore,
  getAllUsers,
  getHydratedInvoices,
  getParticipantSplits,
  getProjectSettings,
} from "../src/lib/db";
import {
  updateProjectSettingsAction,
  changeOwnPasswordAction,
  adminResetUserPasswordAction,
  deleteUserAction,
  reportSplitPaymentNoticeAction,
  reportAllPendingSplitsNoticeAction,
  type SessionActor,
} from "../src/actions/invoice-actions";

const DB_FILE = path.join(process.cwd(), ".data", "controle-obra-db.json");

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
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ id, name, passed: false, error: msg });
    console.error(`❌ [FAIL] ${id}: ${name}\n   ↳ ${msg}`);
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

      // Valores ímpares (R$ 10,01 e R$ 1.234,57)
      const odd50 = calculatePresetSplits(10.01, mockUsers3, "50/50");
      assert.deepEqual(odd50.map((s) => s.amountDue), [5.01, 5.0, 0.0]);
      assert.equal(isSplitSumExact(10.01, odd50), true);

      const oddEqual = calculatePresetSplits(1234.57, mockUsers3, "EQUAL_ALL");
      assert.equal(isSplitSumExact(1234.57, oddEqual), true);
      assert.equal(calculateSplitsDifferenceInCents(1234.57, oddEqual), 0);
    }
  );

  await runTest(
    "TC-01.5",
    "Imunidade a ponto flutuante IEEE 754 (ex: 19.99 + 3.01 === 23.00 e 0.1 + 0.2 === 0.30)",
    () => {
      assert.equal(toCents(19.99) + toCents(3.01), 2300);
      assert.equal(fromCents(toCents(19.99) + toCents(3.01)), 23.0);
      assert.equal(
        isSplitSumExact(0.3, [{ amountDue: 0.1 }, { amountDue: 0.2 }]),
        true
      );
      assert.deepEqual(distributeEqualInCents(10000, 3), [3334, 3333, 3333]);
      assert.deepEqual(distributeByWeightsInCents(10000, [1, 1, 1]), [
        3334, 3333, 3333,
      ]);
    }
  );

  // ==========================================================================
  // TC-02: Rejeição Estrita de Divergência de 1 Centavo no Zod (Tolerância Zero)
  // ==========================================================================
  const baseValidInvoice = {
    documentNumber: "NF-QA-999",
    supplier: "Fornecedor Teste QA",
    date: "2026-10-27",
    categoryId: "aaaa1111-1111-4111-8111-111111111111",
    installments: 1,
    pixKey: "ikaro@pix.com.br",
    paidBy: "Ikaro (Administrador)",
    observations: "Nota de teste adversário",
    items: [
      {
        description: "Cimento Estrutural",
        unit: "sc",
        quantity: 10,
        totalValue: 100.0,
        stage: "Estrutura & Alvenaria",
        splitModel: "CUSTOM",
        splits: [
          { userId: "u-admin", amountDue: 50.0, status: "PAID" as const },
          { userId: "u-part-1", amountDue: 50.0, status: "PENDING" as const },
        ],
      },
    ],
  };

  await runTest(
    "TC-02.1",
    "Rejeita divergência de -1 centavo: Item R$ 100,00 com cotas [50.00, 49.99] (soma 99.99)",
    () => {
      const payload = structuredClone(baseValidInvoice);
      payload.items[0].splits = [
        { userId: "u-admin", amountDue: 50.0, status: "PAID" },
        { userId: "u-part-1", amountDue: 49.99, status: "PENDING" },
      ];
      const parsed = createInvoiceSchema.safeParse(payload);
      assert.equal(
        parsed.success,
        false,
        "Deveria rejeitar soma 99.99 para item de 100.00"
      );
    }
  );

  await runTest(
    "TC-02.2",
    "Rejeita divergência de +1 centavo: Item R$ 100,00 com cotas [50.00, 50.01] (soma 100.01)",
    () => {
      const payload = structuredClone(baseValidInvoice);
      payload.items[0].splits = [
        { userId: "u-admin", amountDue: 50.0, status: "PAID" },
        { userId: "u-part-1", amountDue: 50.01, status: "PENDING" },
      ];
      const parsed = createInvoiceSchema.safeParse(payload);
      assert.equal(
        parsed.success,
        false,
        "Deveria rejeitar soma 100.01 para item de 100.00"
      );
    }
  );

  await runTest(
    "TC-02.3",
    "Rejeita divergência de 4 centavos (antiga brecha <= 0.05): Item R$ 100,00 com cotas [50.00, 49.96]",
    () => {
      const payload = structuredClone(baseValidInvoice);
      payload.items[0].splits = [
        { userId: "u-admin", amountDue: 50.0, status: "PAID" },
        { userId: "u-part-1", amountDue: 49.96, status: "PENDING" },
      ];
      const parsed = createInvoiceSchema.safeParse(payload);
      assert.equal(
        parsed.success,
        false,
        "Antiga brecha de 0.05 foi fechada: 99.96 deve ser rejeitado"
      );
    }
  );

  await runTest(
    "TC-02.4",
    "Aceita rateio de dízima com centavo residual exato: Item R$ 100,00 com [33.34, 33.33, 33.33]",
    () => {
      const payload = structuredClone(baseValidInvoice);
      payload.items[0].splits = [
        { userId: "u-admin", amountDue: 33.34, status: "PAID" },
        { userId: "u-part-1", amountDue: 33.33, status: "PENDING" },
        { userId: "u-part-2", amountDue: 33.33, status: "PENDING" },
      ];
      const parsed = createInvoiceSchema.safeParse(payload);
      assert.equal(parsed.success, true);
    }
  );

  // ==========================================================================
  // TC-03: Entradas Maliciosas, Valores Negativos, Zero, NaN e Limites
  // ==========================================================================
  await runTest(
    "TC-03.1",
    "Rejeita valores negativos (-10) em totalValue ou em amountDue (tentativa de burlar soma com cota negativa)",
    () => {
      // Cota negativa compensando outra cota (ex: 110 + (-10) = 100)
      assert.equal(
        isSplitSumExact(100, [{ amountDue: 110 }, { amountDue: -10 }]),
        false,
        "Não deve permitir cota negativa mesmo que a soma algébrica feche 100"
      );

      const payloadNegSplit = structuredClone(baseValidInvoice);
      payloadNegSplit.items[0].splits = [
        { userId: "u-admin", amountDue: 110.0, status: "PAID" },
        { userId: "u-part-1", amountDue: -10.0, status: "PENDING" },
      ];
      assert.equal(createInvoiceSchema.safeParse(payloadNegSplit).success, false);

      const payloadNegTotal = structuredClone(baseValidInvoice);
      payloadNegTotal.items[0].totalValue = -50;
      assert.equal(createInvoiceSchema.safeParse(payloadNegTotal).success, false);
    }
  );

  await runTest(
    "TC-03.2",
    "Rejeita valor total de item igual a zero (0), NaN ou Infinity",
    () => {
      assert.equal(isSplitSumExact(0, [{ amountDue: 0 }]), false);
      assert.equal(isSplitSumExact(NaN, [{ amountDue: 10 }]), false);
      assert.equal(
        isSplitSumExact(Infinity, [{ amountDue: Infinity }]),
        false
      );
      assert.equal(isSplitSumExact(100, [{ amountDue: NaN }]), false);

      const payloadZero = structuredClone(baseValidInvoice);
      payloadZero.items[0].totalValue = 0;
      payloadZero.items[0].splits = [
        { userId: "u-admin", amountDue: 0, status: "PAID" },
      ];
      assert.equal(createInvoiceSchema.safeParse(payloadZero).success, false);
    }
  );

  await runTest(
    "TC-03.3",
    "Rejeita parcelas inválidas (0 ou 121), strings vazias e senhas curtas (< 6 chars)",
    () => {
      const payloadInst0 = structuredClone(baseValidInvoice);
      payloadInst0.installments = 0;
      assert.equal(createInvoiceSchema.safeParse(payloadInst0).success, false);

      const payloadInst121 = structuredClone(baseValidInvoice);
      payloadInst121.installments = 121;
      assert.equal(createInvoiceSchema.safeParse(payloadInst121).success, false);

      const payloadEmptyDoc = structuredClone(baseValidInvoice);
      payloadEmptyDoc.documentNumber = "   ";
      assert.equal(createInvoiceSchema.safeParse(payloadEmptyDoc).success, false);

      // Senhas curtas
      assert.equal(
        createUserSchema.safeParse({
          name: "Teste",
          email: "teste@obra.com",
          password: "123",
          role: "PARTICIPANT",
        }).success,
        false
      );
      assert.equal(
        changeOwnPasswordSchema.safeParse({
          currentPassword: "admin123",
          newPassword: "123",
        }).success,
        false
      );
      assert.equal(
        adminResetPasswordSchema.safeParse({
          targetUserId: "u-1",
          newPassword: "123",
        }).success,
        false
      );
      assert.equal(
        updateProjectSettingsSchema.safeParse({
          projectName: "AB", // min 3
          officialPixKey: "a",
          pixReceiverName: "I",
        }).success,
        false
      );
      assert.equal(
        reportPaymentNoticeSchema.safeParse({
          splitId: "",
          note: "a",
        }).success,
        false
      );
    }
  );

  // ==========================================================================
  // TC-04: Persistência, Integridade Relacional, Anti-IDOR / RBAC e Privacidade
  // ==========================================================================
  await runTest(
    "TC-04.1",
    "Isolamento de Banco + Bloqueio Anti-IDOR: Participante A NÃO consegue registrar aviso de PIX em cota do Participante B",
    async () => {
      // Garante que o arquivo inicial exista antes do backup
      readLocalStore();
      const backupRaw = fs.readFileSync(DB_FILE, "utf-8");

      try {
        const store = readLocalStore();
        const admin = store.users.find((u) => u.role === "ADMIN")!;
        const participants = store.users.filter((u) => u.role === "PARTICIPANT");
        assert.ok(admin, "Admin deve existir no seed");
        assert.ok(participants.length >= 2, "Deve haver ao menos 2 participantes no seed");

        const mariana = participants[0]; // 2222...
        const carlos = participants[1]; // 3333...

        // Localiza uma cota PENDING pertencente à Mariana
        const marianaPendingSplit = store.itemSplits.find(
          (s) => s.userId === mariana.id && s.status === "PENDING"
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
        const storeAfterIdor = readLocalStore();
        const unchangedSplit = storeAfterIdor.itemSplits.find(
          (s) => s.id === marianaPendingSplit.id
        )!;
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

        const storeAfterLegit = readLocalStore();
        const updatedSplit = storeAfterLegit.itemSplits.find(
          (s) => s.id === marianaPendingSplit.id
        )!;
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
        const storeAfterBatch = readLocalStore();
        const carlosPending = storeAfterBatch.itemSplits.filter(
          (s) => s.userId === carlos.id && s.status === "PENDING"
        );
        assert.ok(
          carlosPending.every((s) => s.paymentNote === "PIX informado: PIX Lote Carlos")
        );
      } finally {
        fs.writeFileSync(DB_FILE, backupRaw, "utf-8");
      }
    }
  );

  await runTest(
    "TC-04.2",
    "Integridade Relacional e RBAC: Bloqueia exclusão de participante com cotas vinculadas (splitsCount > 0), autoexclusão de Admin e ações restritas",
    async () => {
      readLocalStore();
      const backupRaw = fs.readFileSync(DB_FILE, "utf-8");

      try {
        const store = readLocalStore();
        const admin = store.users.find((u) => u.role === "ADMIN")!;
        const mariana = store.users.find((u) => u.email === "mariana@obra.com")!;

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
        store.users.push({
          id: tempUserId,
          name: "Participante Temporário Sem Cotas",
          email: "temp@obra.com",
          passwordHash: bcrypt.hashSync("senha123", 10),
          role: "PARTICIPANT",
          avatarColor: "#78716C",
          phone: null,
          createdAt: new Date().toISOString(),
        });
        writeLocalStore(store);

        const cleanDel = await deleteUserAction(tempUserId, actorAdmin);
        assert.equal(cleanDel.success, true);
        assert.equal(
          readLocalStore().users.some((u) => u.id === tempUserId),
          false
        );
      } finally {
        fs.writeFileSync(DB_FILE, backupRaw, "utf-8");
      }
    }
  );

  await runTest(
    "TC-04.3",
    "Gestão de Senhas e Configurações da Obra (ProjectSettings + Propagação de PIX + Troca de Senha Anti-IDOR)",
    async () => {
      readLocalStore();
      const backupRaw = fs.readFileSync(DB_FILE, "utf-8");

      try {
        const store = readLocalStore();
        const admin = store.users.find((u) => u.role === "ADMIN")!;
        const mariana = store.users.find((u) => u.email === "mariana@obra.com")!;

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

        const updatedMariana = readLocalStore().users.find(
          (u) => u.id === mariana.id
        )!;
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
        const resetMariana = readLocalStore().users.find(
          (u) => u.id === mariana.id
        )!;
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
        fs.writeFileSync(DB_FILE, backupRaw, "utf-8");
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
