# Etapa 2 — Relatório Formal de Entrega de Backend & Banco de Dados (`senior-backend-eng`)

**Projeto**: Controle de Obra  
**Responsável pela Implementação**: `senior-backend-eng` (Staff Backend & Database Engineer)  
**Data**: 2026-10-27  
**Status**: Concluído — Pronto para Validação Adversária (`senior-qa-sdet`) e Integração de UI (`senior-frontend-eng`)  

---

## 1. Resumo Executivo das Entregas (`B1` a `B7`)

Todas as especificações arquiteturais definidas pelo `tech-lead-architect` em [`.agents/teamwork/stage1-architecture-plan.md`](./stage1-architecture-plan.md) para a camada de Domínio Contábil, Banco de Dados, Validação Zod, Autenticação e Server Actions foram 100% implementadas e verificadas:

1. **Módulo Puro de Domínio Contábil ([`src/lib/split-calculator.ts`](../../src/lib/split-calculator.ts))**:
   - Implementação determinística em centavos inteiros (`Math.round(val * 100)`) sem imprecisão de ponto flutuante binário (`IEEE 754`).
   - Funções exportadas:
     - `toCents(value: number): number`
     - `fromCents(cents: number): number`
     - `calculateSplitsDifferenceInCents(totalValue: number, splits: { amountDue: number }[]): number`
     - `isSplitSumExact(totalValue: number, splits: { amountDue: number }[]): boolean`
     - `distributeEqualInCents(totalCents: number, count: number): number[]`
     - `distributeByWeightsInCents(totalCents: number, weights: number[]): number[]`
     - `calculatePresetSplits(totalValue: number, users: SplitParticipantInput[], preset: SplitPreset | string, targetUserIdFor100?: string): CalculatedSplit[]`
   - Garante matematicamente que dízimas periódicas (ex: `R$ 100,00 / 3 = 33.34 + 33.33 + 33.33`) preservem 100% dos centavos na soma final.

2. **Schemas de Validação Zod & Invariante de Tolerância Zero ([`src/lib/validations/invoice.ts`](../../src/lib/validations/invoice.ts))**:
   - Removida a antiga tolerância frouxa de `0.05` em `invoiceItemSchema`.
   - Agora `invoiceItemSchema` invoca `isSplitSumExact(item.totalValue, item.splits)` exigindo diferença estrita de `0` centavos (`sumCents === totalCents`).
   - `createUserSchema` atualizado para exigir senha com mínimo de 6 caracteres.
   - Novos schemas Zod exportados:
     - `updateProjectSettingsSchema`
     - `changeOwnPasswordSchema`
     - `adminResetPasswordSchema`
     - `deleteUserSchema`
     - `reportPaymentNoticeSchema`
     - `reportAllPendingNoticeSchema`

3. **Evolução Relacional e Configurações da Obra ([`prisma/schema.prisma`](../../prisma/schema.prisma) & [`src/lib/db.ts`](../../src/lib/db.ts))**:
   - Adicionado o modelo `ProjectSettings` (`@@map("project_settings")`) em `prisma/schema.prisma` e executado `npx prisma generate` com sucesso.
   - Adicionado `ProjectSettingsRecord` e `DEFAULT_PROJECT_SETTINGS` (`id: "default"`, `projectName: "Residência • Controle de Obra"`, `officialPixKey`, `pixReceiverName: "Ikaro (Administrador)"`, `updatedAt`) em `src/lib/db.ts`.
   - Migração automática e retrocompatível em `readLocalStore()` para garantir que qualquer arquivo `.data/controle-obra-db.json` pré-existente receba `projectSettings` sem perda de dados.
   - Exportada `getProjectSettings(): Promise<ProjectSettingsRecord>`.
   - Todos os agregadores financeiros (`getAllUsers`, `getHydratedInvoices`, `getParticipantSplits`) foram refatorados para somar utilizando `toCents` / `fromCents`.

4. **Novas Server Actions Blindadas com RBAC e Anti-IDOR ([`src/actions/invoice-actions.ts`](../../src/actions/invoice-actions.ts))**:
   - Implementados os guardas `requireAuth()` e `requireAdmin()`.
   - Implementadas e exportadas as novas Server Actions (com suporte a `_testActor?: SessionActor` opcional para facilitar testes automatizados pelo `senior-qa-sdet` fora do contexto de cookies HTTP):
     - `updateProjectSettingsAction`: Exclusiva para `ADMIN`. Atualiza configurações da obra e opcionalmente propaga a nova chave PIX para todas as notas com cotas `PENDING` (`applyToPendingInvoices` / `updatePendingInvoicesPix`).
     - `changeOwnPasswordAction`: Qualquer usuário autenticado altera exclusivamente a própria senha (`actor.id`), exigindo validação da senha atual com `bcrypt.compare`. Zero risco de IDOR.
     - `adminResetUserPasswordAction`: Exclusiva para `ADMIN`. Redefine a senha de um participante com hash `bcrypt` (custo 10).
     - `deleteUserAction`: Exclusiva para `ADMIN`. Bloqueia autoexclusão (`targetUserId === actor.id`) e bloqueia exclusão de participante que possua vínculos em `itemSplits` (`splitsCount > 0`).
     - `reportSplitPaymentNoticeAction`: Permite ao usuário autenticado informar o envio de PIX em uma cota `PENDING` exclusivamente sua (`split.userId === actor.id`), bloqueando tentativas de IDOR sobre cotas de terceiros ou cotas já `PAID`.
     - `reportAllPendingSplitsNoticeAction`: Permite ao usuário autenticado registrar aviso de PIX em todas as suas próprias cotas `PENDING` de uma só vez.

5. **Blindagem de Segredo e Security Headers ([`src/auth.ts`](../../src/auth.ts) & [`next.config.ts`](../../next.config.ts))**:
   - Em `src/auth.ts`, removida a chave de produção hardcoded. Adicionada `resolveAuthSecret()` que exige `process.env.AUTH_SECRET` em `NODE_ENV === "production"` e restringe o fallback apenas ao ambiente de desenvolvimento/teste local.
   - Em `next.config.ts`, configurados os cabeçalhos HTTP de segurança para todas as rotas (`/(.*)`):
     - `X-Frame-Options: DENY`
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 2. Verificação de Compilação e Tipagem Estática

- Comando executado: `npx prisma generate` $\rightarrow$ **Exit Code `0`**
- Comando executado: `npx tsc --noEmit` $\rightarrow$ **Exit Code `0`** (zero erros de compilação TypeScript)
