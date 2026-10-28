# Etapa 2 — Relatório Formal de Auditoria de Qualidade e Testes Adversários (`senior-qa-sdet`)

**Projeto**: Controle de Obra  
**Responsável pela Auditoria (Quality Gatekeeper)**: `senior-qa-sdet` (Senior QA & Automation Engineer / SDET)  
**Data**: 2026-10-27  
**Suíte Executada**: [`tests/adversarial-qa.test.ts`](../../tests/adversarial-qa.test.ts) (`npm test` / `npx tsx tests/adversarial-qa.test.ts`)  
**Veredito Oficial**: **`APPROVED_BY_QA`**

---

## 1. Resumo Executivo da Auditoria Adversária

Atuando como Portão de Qualidade da Etapa 2 conforme [`.agents/rules/governance-workflow.md`](../rules/governance-workflow.md) e o plano de testes definido em [`.agents/teamwork/stage1-architecture-plan.md`](./stage1-architecture-plan.md), construímos e executamos a suíte automatizada de testes adversários em [`tests/adversarial-qa.test.ts`](../../tests/adversarial-qa.test.ts) (registrada no script `"test": "tsx tests/adversarial-qa.test.ts"` do [`package.json`](../../package.json)).

Foram executados **16 casos de teste adversários agrupados em 4 baterias críticas (`TC-01` a `TC-04`)**, cobrindo matemática financeira de centavos inteiros, validação Zod de tolerância zero, entradas maliciosas, integridade relacional, controle de acesso RBAC/Anti-IDOR com isolamento transacional do banco `.data/controle-obra-db.json` e inspeção estática de vazamento de credenciais.

- **Resultado da Suíte (`npm test`)**: **16 / 16 aprovados (100% PASS, Exit Code `0`)**
- **Resultado da Compilação (`npx tsc --noEmit`)**: **Exit Code `0` (Zero erros TypeScript)**

---

## 2. Matriz de Cobertura e Resultados dos Testes (`TC-01` a `TC-04`)

| ID | Cenário Adversário / Regra de Negócio | Resultado Esperado | Resultado Obtido | Status |
| :--- | :--- | :--- | :--- | :---: |
| **`TC-01.1`** | Dízima clássica: `R$ 100,00 / 3` (`EQUAL_ALL`) | Retornar `[33.34, 33.33, 33.33]`, soma exata `100.00`, diferença `0` centavos, status `ADMIN=PAID` e `PARTICIPANT=PENDING` | `[33.34, 33.33, 33.33]`, `isSplitSumExact === true`, `diffCents === 0` | ✅ PASS |
| **`TC-01.2`** | Centavo único indivisível: `R$ 0,01 / 3` (`EQUAL_ALL`) | Retornar `[0.01, 0.00, 0.00]`, soma exata `0.01` | `[0.01, 0.00, 0.00]`, `isSplitSumExact === true` | ✅ PASS |
| **`TC-01.3`** | Dois centavos entre 3: `R$ 0,02 / 3` (`EQUAL_ALL`) | Retornar `[0.01, 0.01, 0.00]`, soma exata `0.02` | `[0.01, 0.01, 0.00]`, `isSplitSumExact === true` | ✅ PASS |
| **`TC-01.4`** | Presets proporcionais (`50/50`, `60/40`, `70/30`, `100/0`) em `R$ 10,00`, `R$ 10,01` e `R$ 1.234,57` | Alocação exata de centavos residuais sem perda ou sobra | Somas exatas em 100% dos presets e valores ímpares | ✅ PASS |
| **`TC-01.5`** | Imunidade a ponto flutuante IEEE 754 (`19.99 + 3.01` e `0.1 + 0.2`) | Operar em centavos inteiros (`2300` centavos = `23.00`, `30` centavos = `0.30`) | Zero dízimas de ponto flutuante binário | ✅ PASS |
| **`TC-02.1`** | Divergência de `-1` centavo no Zod: Item `100.00` com cotas `[50.00, 49.99]` (`99.99`) | `createInvoiceSchema.safeParse` deve **REJEITAR** (`success: false`) | Rejeitado com sucesso (`success: false`) | ✅ PASS |
| **`TC-02.2`** | Divergência de `+1` centavo no Zod: Item `100.00` com cotas `[50.00, 50.01]` (`100.01`) | `createInvoiceSchema.safeParse` deve **REJEITAR** (`success: false`) | Rejeitado com sucesso (`success: false`) | ✅ PASS |
| **`TC-02.3`** | Antiga brecha de `0.05`: Item `100.00` com cotas `[50.00, 49.96]` (`99.96`) | `createInvoiceSchema.safeParse` deve **REJEITAR** (`success: false`) | Rejeitado com sucesso (`success: false`) | ✅ PASS |
| **`TC-02.4`** | Aceitação de dízima com centavo residual ajustado: Item `100.00` com `[33.34, 33.33, 33.33]` | `createInvoiceSchema.safeParse` deve **APROVAR** (`success: true`) | Aprovado (`success: true`) | ✅ PASS |
| **`TC-03.1`** | Valores negativos (`-10`) em `totalValue` ou `amountDue` (ex: `110 + (-10) = 100`) | Rejeitar cotas negativas mesmo que a soma algébrica feche `100` | `isSplitSumExact === false` e Zod `success: false` | ✅ PASS |
| **`TC-03.2`** | Valores nulos/inválidos: `0`, `NaN`, `Infinity` em `totalValue` ou `amountDue` | Rejeitar imediatamente sem exceção não tratada | `isSplitSumExact === false` e Zod `success: false` | ✅ PASS |
| **`TC-03.3`** | Limites de domínio: parcelas `0` ou `121`, strings vazias e senhas `< 6` caracteres | Rejeitar em todos os schemas (`createInvoiceSchema`, `createUserSchema`, `changeOwnPasswordSchema`, `adminResetPasswordSchema`, `updateProjectSettingsSchema`, `reportPaymentNoticeSchema`) | Todos rejeitados conforme regras de negócio | ✅ PASS |
| **`TC-04.1`** | **Anti-IDOR no Aviso de PIX**: Participante B (Carlos) tenta registrar aviso de PIX na cota da Participante A (Mariana) | Bloquear tentativa (`success: false`, `"Acesso negado"`), manter cota intacta; permitir quando acionado pela própria Mariana mantendo `status === "PENDING"` | IDOR bloqueado; ação legítima registrada com sucesso; backup de `.data/controle-obra-db.json` restaurado | ✅ PASS |
| **`TC-04.2`** | **Integridade Relacional e RBAC**: Exclusão de usuário com `splitsCount > 0`, autoexclusão de Admin e tentativa por `PARTICIPANT` | Bloquear todos os 3 casos; permitir exclusão pelo Admin apenas quando `splitsCount === 0` | Todos os bloqueios funcionaram; usuário temporário sem cotas removido com sucesso | ✅ PASS |
| **`TC-04.3`** | **Ciclo de Vida de Senhas & `ProjectSettings`**: `PARTICIPANT` tenta alterar `ProjectSettings`; `ADMIN` atualiza e propaga chave PIX; troca de senha exige senha atual correta | Bloquear `PARTICIPANT`; persistir `ProjectSettings` pelo `ADMIN`; validar `bcrypt.compare` na troca de senha | 100% validado e restaurado sem sujar o banco local | ✅ PASS |
| **`TC-04.4`** | **Inspeção Estática de Segurança**: `src/app/login/page.tsx` e `src/auth.ts` | Ausência total de `admin123`, `obra123`, `fillDemoUser` no login e ausência de secret de produção hardcoded irrestrito em `src/auth.ts` | Zero ocorrências de credenciais vazadas | ✅ PASS |

---

## 3. Evidências de Execução no Terminal

1. **Execução da Suíte de Testes (`npm test`)**:
   ```text
   > controle-de-obra@1.0.0 test
   > tsx tests/adversarial-qa.test.ts

   📊 RESUMO FINAL DA SUÍTE ADVERSÁRIA: 16/16 TESTES APROVADOS (0 FALHAS)
   ✅ STATUS DO GATEKEEPER: APPROVED_BY_QA
   ```
2. **Verificação de Compilação e Tipagem (`npx tsc --noEmit`)**:
   - Código de saída: `0` (nenhum erro de compilação em `src/` ou `tests/`).

---

## 4. Certificação do Gatekeeper (Etapa 2)

Todos os critérios de aceitação contábeis, funcionais, relacionais e de segurança adversária foram comprovados por testes automatizados executáveis. O código está liberado para avançar para a **Etapa 3 (Revisão Arquitetural pelo `tech-lead-architect`)** e **Etapa 4 (Auditoria de Segurança pelo `ciso-security-lead`)**.

**Selo Oficial**: **`APPROVED_BY_QA`**
