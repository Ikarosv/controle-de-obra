# Etapa 1 — Planejamento Técnico e Arquitetura (`tech-lead-architect`)

**Projeto**: Controle de Obra (Sistema Privado do Dono da Obra & Participantes do Rateio)  
**Responsável pela Especificação**: `tech-lead-architect` (Principal Software Architect & Tech Lead)  
**Data**: 2026-10-27  
**Status**: Especificação Formal Concluída — Pronta para Handoff (Etapa 2)  
**Referência de Governança**: [`.agents/rules/governance-workflow.md`](../rules/governance-workflow.md)

---

## 1. Diagnóstico Arquitetural do Código Atual (`As-Is` vs `To-Be`)

Após auditoria estática de todo o repositório ([`prisma/schema.prisma`](../../prisma/schema.prisma), [`src/auth.ts`](../../src/auth.ts), [`src/auth.config.ts`](../../src/auth.config.ts), [`src/lib/db.ts`](../../src/lib/db.ts), [`src/lib/validations/invoice.ts`](../../src/lib/validations/invoice.ts), [`src/actions/invoice-actions.ts`](../../src/actions/invoice-actions.ts), [`src/app/login/page.tsx`](../../src/app/login/page.tsx), [`src/components/admin/admin-dashboard.tsx`](../../src/components/admin/admin-dashboard.tsx), [`src/components/admin/invoice-master-form.tsx`](../../src/components/admin/invoice-master-form.tsx) e [`src/components/participant/participant-dashboard.tsx`](../../src/components/participant/participant-dashboard.tsx)), identificamos **4 pilares críticos** que precisam ser refinados e blindados para que o sistema opere como um **sistema privado, fechado e seguro para a obra do Ikaro e os participantes do pagamento**:

### 1.1 Vulnerabilidades de Segurança e Privacidade de Sistema Fechado (Risco de Veto do `ciso-security-lead`)
1. **Exposição de Credenciais em Texto Claro na Tela de Login ([`src/app/login/page.tsx`](../../src/app/login/page.tsx#L12-L35))**:
   - *Problema*: O estado inicial preenche `email = "admin@obra.com"` e `password = "admin123"` automaticamente, além de renderizar um bloco `"Acesso Rápido (Perfis Cadastrados no Banco)"` que exibe os e-mails e senhas de todos os participantes em texto claro (`admin123`, `obra123`) para qualquer pessoa que acessar a URL de login.
   - *Solução Arquitetural*: Remover integralmente o autopreenchimento de senha e o bloco de botões de "Acesso Rápido" com senhas expostas. Iniciar `email` e `password` vazios (`""`) e exibir apenas um rodapé discreto de sistema fechado (*"Acesso restrito ao administrador e participantes cadastrados na obra"*).
2. **Segredo de Sessão Hardcoded em Produção ([`src/auth.ts`](../../src/auth.ts#L16))**:
   - *Problema*: `secret: process.env.AUTH_SECRET || "controle-de-obra-warm-minimalism-secret-key-2026-prod"` permite que a aplicação rode em produção com chave previsível no código-fonte.
   - *Solução Arquitetural*: Higienizar `src/auth.ts` para ler `process.env.AUTH_SECRET`. Em ambiente de produção (`process.env.NODE_ENV === "production"`), falhar explicitamente se `AUTH_SECRET` não estiver definido; em desenvolvimento/teste local sem `.env`, permitir fallback seguro restrito a `NODE_ENV !== "production"`.
3. **Ausência de Middleware/Proxy de Proteção de Rotas**:
   - *Problema*: Não existe `src/middleware.ts` (ou `src/proxy.ts`) interceptando requisições na borda; a proteção depende apenas de verificações manuais nas páginas Server Components.
   - *Solução Arquitetural*: Garantir proteção consistente de sessão e cabeçalhos de segurança básicos em `next.config.ts` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`) além da guarda rigorosa nas Server Pages e Server Actions.
4. **Gestão de Senhas e Ciclo de Vida de Participantes**:
   - *Problema*: Nem o Admin (Ikaro) nem os participantes conseguem alterar sua própria senha pelo sistema após o primeiro acesso. Além disso, o Admin não consegue redefinir a senha de um participante que esqueceu a credencial, nem remover um participante cadastrado por engano (desde que não possua rateios vinculados). E no formulário de criação de usuário ([`src/components/admin/admin-dashboard.tsx`](../../src/components/admin/admin-dashboard.tsx#L97)), a senha inicial vem hardcoded como `"obra123"` em um `<input type="text">`.
   - *Solução Arquitetural*:
     - Criar `changeOwnPasswordAction` (qualquer usuário autenticado altera a própria senha informando `currentPassword` + `newPassword`).
     - Criar `adminResetUserPasswordAction` (exclusivo `ADMIN`: redefine a senha de um participante).
     - Criar `deleteUserAction` (exclusivo `ADMIN`: remove um participante apenas se `splitsCount === 0` e não for o próprio Admin logado).

### 1.2 Violação da Invariante Contábil de Rateio ($\sum \text{amountDue} \equiv \text{totalValue}$)
1. **Tolerância Frouxa de R$ 0,05 ([`src/lib/validations/invoice.ts`](../../src/lib/validations/invoice.ts#L40) e [`src/components/admin/invoice-master-form.tsx`](../../src/components/admin/invoice-master-form.tsx#L428))**:
   - *Problema*: O schema Zod atual valida `Math.abs(sum - total) <= 0.05`. Isso permite que uma nota de R$ 100,00 seja salva com R$ 99,95 ou R$ 100,05 de rateio, violando a cláusula 6.1 de [`.agents/rules/governance-workflow.md`](../rules/governance-workflow.md) e causando bloqueio imediato (`QA_BLOCKED`) pelo `senior-qa-sdet`.
2. **Aritmética de Ponto Flutuante Acoplada à UI ([`src/components/admin/invoice-master-form.tsx`](../../src/components/admin/invoice-master-form.tsx#L51-L83))**:
   - *Problema*: O cálculo de divisão (`50/50`, `60/40`, `70/30`, `100/0`, `EQUAL_ALL`) está embutido dentro do componente React usando multiplicação `float` (`totalVal * 0.5`), o que falha em dízimas ou quando há mais de 2 participantes.
   - *Solução Arquitetural*:
     - Criar o módulo de domínio puro [`src/lib/split-calculator.ts`](../../src/lib/split-calculator.ts) operando estritamente em **centavos inteiros (`Math.round(val * 100)`)**.
     - Garantir que `Math.round(sum * 100) === Math.round(total * 100)` (diferença zero em centavos: `0`).
     - Alocar centavos residuais de divisões não-exatas (ex: R$ 100,00 / 3 = `3334`, `3333`, `3333` centavos -> R$ 33,34, R$ 33,33, R$ 33,33) de forma determinística nos primeiros participantes ativos do rateio.

### 1.3 UX e Funcionalidades Práticas para a Obra Pessoal (Admin + Participantes)
1. **Configurações Oficiais da Obra (`ProjectSettings`)**:
   - *Problema*: A chave PIX padrão está hardcoded em `DEFAULT_PIX_KEY = "obra.residencial@pix.com.br"`, o nome do titular está fixo no texto do componente do participante (`"Titular: Ikaro (Administrador da Obra)"`) e o nome da obra está fixo na Navbar. Se o Ikaro quiser definir sua chave PIX real (CPF, celular ou e-mail) uma única vez para todas as próximas notas e para o destaque no painel dos participantes, não há onde salvar.
   - *Solução Arquitetural*: Adicionar a entidade/configuração `ProjectSettings` (`projectName`, `officialPixKey`, `pixReceiverName`, `updatedAt`) no banco (`prisma/schema.prisma` + store persistente em `src/lib/db.ts`) e expor um formulário de **"Configurações da Obra & Chave PIX Oficial"** no painel do Admin (`AdminDashboard`), fazendo com que o `InvoiceMasterForm`, a `Navbar` e o `ParticipantDashboard` utilizem esses dados dinâmicos.
2. **Interação Direta do Participante no `/meu-painel` (Informar Pagamento PIX + Alterar Senha)**:
   - *Problema*: Hoje o `/meu-painel` é 100% passivo (somente leitura). Quando a Mariana ou o Carlos fazem o PIX para o Ikaro, eles não conseguem clicar em um botão no próprio item ou lote para avisar *"Já enviei o PIX (comprovante/data)"* dentro do sistema.
   - *Solução Arquitetural*:
     - Permitir que o participante registre um **Aviso de Pagamento PIX** (`reportSplitPaymentNoticeAction`) em sua cota pendente (ou em todas as suas cotas pendentes de uma vez), preenchendo `paymentNote` com um aviso estruturado (ex: `"⚡ Aviso do Participante: PIX enviado em 27/10 — aguardando confirmação"` ou texto customizado pelo participante).
     - **Blindagem Anti-IDOR**: Validar estritamente no servidor que `split.userId === session.user.id` (ou `session.user.role === "ADMIN"`). Um participante jamais pode alterar `status` para `PAID` (prerrogativa exclusiva do Admin após conferir o extrato bancário), mas pode atualizar a nota de aviso (`paymentNote`) de sua própria cota `PENDING`, destacando visualmente no painel do Admin que há um pagamento aguardando conferência!
     - Adicionar no `/meu-painel` (e na `Navbar` / área da conta) um modal/seção rápida de **"Alterar Minha Senha"**.

---

## 2. Decomposição em Tarefas Atômicas e Contratos Técnicos

### Tarefa 1 — Módulo de Domínio Contábil Puro (`src/lib/split-calculator.ts`)
**Executor**: `senior-backend-eng` (consumido também por `senior-frontend-eng` e testado por `senior-qa-sdet`)

Criar [`src/lib/split-calculator.ts`](../../src/lib/split-calculator.ts) sem dependências de I/O ou React:

```typescript
export type SplitPreset = "50/50" | "60/40" | "70/30" | "100/0" | "EQUAL_ALL" | "CUSTOM";

export interface SplitParticipantInput {
  userId: string;
  role: "ADMIN" | "PARTICIPANT";
}

export interface CalculatedSplit {
  userId: string;
  amountDue: number; // Sempre formatado com 2 casas exatas (centavos inteiros / 100)
  status: "PAID" | "PENDING";
}
```

**Regras e Funções Obrigatórias em `src/lib/split-calculator.ts`**:
1. `toCents(value: number): number`:
   - Retorna `Math.round((Number(value) || 0) * 100)`. Trata `NaN` ou `!Number.isFinite` retornando `0`.
2. `fromCents(cents: number): number`:
   - Retorna `Number((cents / 100).toFixed(2))`.
3. `isSplitSumExact(totalValue: number, splits: { amountDue: number }[]): boolean`:
   - Verifica se `totalCents > 0`, se nenhum `amountDue` é negativo (`toCents(s.amountDue) < 0`), se há ao menos um split com `toCents(s.amountDue) > 0`, e se:
     $$\sum_{i=1}^{n} \text{toCents}(\text{splits}[i].\text{amountDue}) === \text{toCents}(\text{totalValue})$$
4. `calculateSplitsDifferenceInCents(totalValue: number, splits: { amountDue: number }[]): number`:
   - Retorna `toCents(totalValue) - splits.reduce((acc, s) => acc + toCents(s.amountDue), 0)`.
5. `distributeByWeightsInCents(totalCents: number, weights: number[]): number[]`:
   - Algoritmo determinístico de Maior Resto / Alocação Sequencial de Centavos Residuais:
   - Se `totalCents <= 0` ou soma dos pesos `<= 0`, retorna array de zeros.
   - Calcula a cota base inteira de cada posição: `floorCents[i] = Math.floor((totalCents * weights[i]) / totalWeight)`.
   - Calcula o resíduo `remainder = totalCents - sum(floorCents)`.
   - Distribui `+1` centavo para os primeiros `remainder` participantes que possuem `weights[i] > 0`.
   - Garante matematicamente que `sum(result) === totalCents`.
6. `calculatePresetSplits(totalValue: number, users: SplitParticipantInput[], preset: SplitPreset, targetUserIdFor100?: string): CalculatedSplit[]`:
   - Converte `totalValue` para `totalCents = toCents(totalValue)`.
   - Para `"50/50"`: pesos `[50, 50, 0, ...]` entre os 2 primeiros usuários (ou `[100]` se houver apenas 1 usuário).
   - Para `"60/40"`: pesos `[60, 40, 0, ...]` entre os 2 primeiros usuários.
   - Para `"70/30"`: pesos `[70, 30, 0, ...]` entre os 2 primeiros usuários.
   - Para `"100/0"`: peso `100` para `targetUserIdFor100` (ou primeiro usuário se omitido) e `0` para os demais.
   - Para `"EQUAL_ALL"`: peso `1` para todos os `users` (`weights = users.map(() => 1)`). Ex: `R$ 100,00` entre 3 usuários gera `[33.34, 33.33, 33.33]`.
   - Define `status: u.role === "ADMIN" ? "PAID" : "PENDING"`.

---

### Tarefa 2 — Evolução do Modelo de Dados e Persistência (`prisma/schema.prisma` & `src/lib/db.ts`)
**Executor**: `senior-backend-eng`

1. **No [`prisma/schema.prisma`](../../prisma/schema.prisma)**:
   Adicionar o modelo `ProjectSettings` para armazenar as configurações globais da obra:
   ```prisma
   model ProjectSettings {
     id              String   @id @default("default")
     projectName     String   @default("Residência • Controle de Obra") @map("project_name")
     officialPixKey  String   @default("obra.residencial@pix.com.br") @map("official_pix_key")
     pixReceiverName String   @default("Ikaro (Administrador da Obra)") @map("pix_receiver_name")
     updatedAt       DateTime @updatedAt @map("updated_at")

     @@map("project_settings")
   }
   ```
2. **Em [`src/lib/db.ts`](../../src/lib/db.ts)**:
   - Adicionar a interface `ProjectSettingsRecord`:
     ```typescript
     export interface ProjectSettingsRecord {
       projectName: string;
       officialPixKey: string;
       pixReceiverName: string;
       updatedAt: string;
     }
     ```
   - Incluir `settings?: ProjectSettingsRecord` em `LocalDatabaseSchema` com fallback resiliente em `readLocalStore()` caso o arquivo `.data/controle-obra-db.json` já exista sem a chave `settings`:
     ```typescript
     const DEFAULT_SETTINGS: ProjectSettingsRecord = {
       projectName: "Residência • Controle de Obra",
       officialPixKey: DEFAULT_PIX_KEY,
       pixReceiverName: "Ikaro (Administrador da Obra)",
       updatedAt: "2026-09-01T10:00:00.000Z",
     };
     ```
   - Exportar `getProjectSettings(): Promise<ProjectSettingsRecord>`.
   - Garantir que `getAllUsers()`, `getHydratedInvoices()` e `getParticipantSplits()` utilizem `toCents` / `fromCents` para somatórios contábeis, evitando dízimas de ponto flutuante (ex: `19.99 + 3.01 = 23.000000000000004`).

---

### Tarefa 3 — Schemas de Validação Estrita (`src/lib/validations/invoice.ts`)
**Executor**: `senior-backend-eng`

Atualizar [`src/lib/validations/invoice.ts`](../../src/lib/validations/invoice.ts):
1. Substituir a validação `Math.abs(sum - total) <= 0.05` em `invoiceItemSchema` por `isSplitSumExact(item.totalValue, item.splits)` importado de `@/lib/split-calculator`:
   - Rejeitar imediatamente qualquer diferença de `>= 1` centavo (`0.01`).
   - Rejeitar qualquer `amountDue < 0` ou `NaN`.
2. Adicionar novos schemas Zod:
   - `updateProjectSettingsSchema`:
     ```typescript
     export const updateProjectSettingsSchema = z.object({
       projectName: z.string().trim().min(3, "Informe o nome da obra").max(100),
       officialPixKey: z.string().trim().min(3, "Informe a chave PIX oficial").max(160),
       pixReceiverName: z.string().trim().min(2, "Informe o nome do titular do PIX").max(100),
     });
     ```
   - `changeOwnPasswordSchema`:
     ```typescript
     export const changeOwnPasswordSchema = z.object({
       currentPassword: z.string().min(1, "Informe a senha atual"),
       newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres").max(100),
     });
     ```
   - `adminResetPasswordSchema`:
     ```typescript
     export const adminResetPasswordSchema = z.object({
       targetUserId: z.string().min(1, "Usuário inválido"),
       newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres").max(100),
     });
     ```
   - `reportPaymentNoticeSchema`:
     ```typescript
     export const reportPaymentNoticeSchema = z.object({
       splitId: z.string().min(1, "Cota inválida"),
       note: z.string().trim().min(2, "Informe uma observação ou data do PIX").max(240, "Observação muito longa"),
     });
     ```
   - Atualizar `createUserSchema` para exigir `password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres").max(100)`.

---

### Tarefa 4 — Blindagem de Autenticação e Server Actions (`src/auth.ts`, `next.config.ts` & `src/actions/invoice-actions.ts`)
**Executor**: `senior-backend-eng`

1. **Blindagem de Segredo em [`src/auth.ts`](../../src/auth.ts)**:
   - Remover a string hardcoded `"controle-de-obra-warm-minimalism-secret-key-2026-prod"`.
   - Configurar leitura segura de `AUTH_SECRET` (com erro explícito se `NODE_ENV === "production"` e `!process.env.AUTH_SECRET`).
2. **Cabeçalhos de Segurança em [`next.config.ts`](../../next.config.ts)**:
   - Adicionar `headers()` aplicando `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` e `Referrer-Policy: strict-origin-when-cross-origin`.
3. **Novas Server Actions em [`src/actions/invoice-actions.ts`](../../src/actions/invoice-actions.ts)**:
   - `updateProjectSettingsAction(rawInput)`:
     - Requer `requireAdmin()`.
     - Valida com `updateProjectSettingsSchema`.
     - Atualiza `store.settings` e opcionalmente atualiza a chave PIX das notas com rateio pendente se solicitado (`updatePendingInvoicesPix?: boolean`).
     - Revalida `/admin` e `/meu-painel`.
   - `changeOwnPasswordAction(rawInput)`:
     - Verifica `const session = await auth(); if (!session?.user?.id) throw ...`.
     - Valida com `changeOwnPasswordSchema`.
     - Busca sempre o usuário pelo `session.user.id` autenticado (nunca aceita `userId` vindo do cliente — **Zero IDOR**).
     - Verifica `bcrypt.compare(currentPassword, user.passwordHash)`. Se incorreta, retorna `{ success: false, message: "A senha atual informada está incorreta." }`.
     - Atualiza `user.passwordHash = await bcrypt.hash(newPassword, 10)`.
   - `adminResetUserPasswordAction(rawInput)`:
     - Requer `requireAdmin()`.
     - Valida com `adminResetPasswordSchema`.
     - Atualiza a senha do usuário alvo com `bcrypt.hash(newPassword, 10)`.
   - `deleteUserAction(targetUserId: string)`:
     - Requer `requireAdmin()`.
     - Impede que o Admin exclua a própria conta (`targetUserId === adminUser.id`).
     - Verifica se existem `itemSplits` vinculados a `targetUserId`. Se houver, bloqueia com mensagem clara (`"Não é possível remover um participante que já possui cotas vinculadas em notas fiscais."`).
     - Remove o usuário e revalida `/admin`.
   - `reportSplitPaymentNoticeAction(rawInput: { splitId: string; note: string })`:
     - Verifica `const session = await auth(); if (!session?.user?.id) return { success: false, message: "Não autenticado." }`.
     - Valida `rawInput` com `reportPaymentNoticeSchema`.
     - Busca a cota `split` no banco.
     - **Verificação Anti-IDOR Crítica**:
       ```typescript
       if (session.user.role !== "ADMIN" && split.userId !== session.user.id) {
         return {
           success: false,
           message: "Acesso negado: você só pode informar pagamentos das suas próprias cotas.",
         };
       }
       ```
     - Se `split.status === "PAID"`, retorna `{ success: false, message: "Esta cota já consta como quitada." }`.
     - Atualiza `split.paymentNote = \`PIX informado: \${parsed.data.note}\`` (mantendo `split.status = "PENDING"` até que o Admin confirme o recebimento no banco).
     - Revalida `/meu-painel` e `/admin`.
   - `reportAllPendingSplitsNoticeAction(note: string)`:
     - Permite ao participante logado avisar de uma só vez que transferiu o PIX referente a todas as suas cotas `PENDING` (`split.userId === session.user.id && split.status === "PENDING"`).

---

### Tarefa 5 — Refinamento de Frontend, Privacidade no Login e UX (`src/app/login/page.tsx`, `src/components/layout/navbar.tsx`, `src/components/admin/*`, `src/components/participant/*`)
**Executor**: `senior-frontend-eng`

1. **Tela de Login Privada ([`src/app/login/page.tsx`](../../src/app/login/page.tsx))**:
   - Iniciar `email` com `""` e `password` com `""`.
   - **Remover completamente** a função `fillDemoUser` e a seção `"Acesso Rápido (Perfis Cadastrados no Banco)"` que expunha `admin123` e `obra123`.
   - Adicionar um aviso elegante no rodapé do card: *"Ambiente privado para gestão financeira e rateio da obra. Caso precise redefinir sua senha, solicite ao administrador."*
2. **Navbar + Modal de Segurança da Conta ([`src/components/layout/navbar.tsx`](../../src/components/layout/navbar.tsx))**:
   - Receber `projectName` opcional nas props (com default `"Residência • Controle de Obra"`).
   - Adicionar botão **"Alterar Senha"** (`KeyRound` icon) ao lado do botão `Sair`, abrindo um modal acessível (WCAG AA) que invoca `changeOwnPasswordAction`, permitindo que tanto o Ikaro quanto qualquer participante troquem sua senha a qualquer momento.
3. **Formulário Mestre-Detalhe de Notas ([`src/components/admin/invoice-master-form.tsx`](../../src/components/admin/invoice-master-form.tsx))**:
   - Receber `defaultPixKey: string` nas props (vindo de `ProjectSettings.officialPixKey`).
   - Substituir toda a lógica local `buildDefaultSplits` por chamadas ao módulo puro [`calculatePresetSplits`](../../src/lib/split-calculator.ts) e [`isSplitSumExact`](../../src/lib/split-calculator.ts).
   - Adicionar um botão **"Ajustar Centavo Residual Automaticamente"** quando o usuário estiver no modo `CUSTOM` e houver pequena diferença de digitação, somando a diferença na primeira cota ativa.
   - Exibir o selo `"✓ Soma fechada"` **somente** quando `isSplitSumExact(itemTotal, currentSplits)` for `true` (diferença exatamente R$ 0,00).
4. **Painel do Administrador ([`src/components/admin/admin-dashboard.tsx`](../../src/components/admin/admin-dashboard.tsx) e [`src/app/admin/page.tsx`](../../src/app/admin/page.tsx))**:
   - Passar `projectSettings` de `src/app/admin/page.tsx` para `AdminDashboard`.
   - Na aba de Notas Fiscais (`INVOICES`), exibir em destaque nas cotas `PENDING` quando o participante tiver enviado um aviso de pagamento (`split.paymentNote`), com um badge âmbar (`#B8860B`) `"🔔 Participante informou PIX: ..."` para facilitar a conferência e baixa pelo Ikaro.
   - Na aba `USERS_AND_CATEGORIES`:
     - Incluir card de **"Configurações da Obra & Chave PIX Oficial"** (editar Nome da Obra, Chave PIX Oficial, Nome do Titular e opção de atualizar a chave PIX nas notas pendentes).
     - Na listagem de usuários cadastrados, adicionar ações para **Redefinir Senha** (`adminResetUserPasswordAction`) e **Remover Participante** (`deleteUserAction`, habilitado quando `u.splitsCount === 0` e `u.role !== "ADMIN"`).
     - No formulário de novo participante, iniciar o campo de senha vazio com `type="password"` e mínimo de 6 caracteres.
5. **Painel do Participante ([`src/components/participant/participant-dashboard.tsx`](../../src/components/participant/participant-dashboard.tsx) e [`src/app/meu-painel/page.tsx`](../../src/app/meu-painel/page.tsx))**:
   - Passar `projectSettings` para `ParticipantDashboard`, exibindo o `pixReceiverName` e `officialPixKey` oficiais.
   - No card principal do PIX, adicionar botão **"Já fiz o PIX do Saldo Pendente (Avisar Admin)"** que abre um campo rápido para registrar o aviso em todas as cotas pendentes (`reportAllPendingSplitsNoticeAction`).
   - Em cada item `PENDING`, além de `"Copiar PIX da Nota"`, adicionar botão **"Informar PIX Enviado"** (`reportSplitPaymentNoticeAction`), e exibir o badge `"⏳ Aviso enviado ao Admin: ..."` caso `split.paymentNote` já esteja preenchido.

---

## 3. Roteiro de Testes Adversários para o SDET (`senior-qa-sdet`)

Na Etapa 2, o `senior-qa-sdet` deverá criar e executar uma suíte automatizada de testes cobrindo obrigatoriamente:

1. **Testes Unitários de Domínio Contábil (`src/lib/__tests__/split-calculator.test.ts` ou script automatizado via `tsx`)**:
   - Divisão de dízima periódica: `R$ 100,00` dividido igualmente (`EQUAL_ALL`) entre 3 participantes $\rightarrow$ deve retornar exatamente `[33.34, 33.33, 33.33]` e `isSplitSumExact` = `true`.
   - Divisão de `R$ 0,01` entre 3 participantes $\rightarrow$ `[0.01, 0.00, 0.00]`, soma = `0.01`.
   - Divisões proporcionais (`50/50`, `60/40`, `70/30`, `100/0`) com valores ímpares como `R$ 10,01`, `R$ 99,99`, `R$ 1.234,57`.
   - Rejeição estrita de divergência de `R$ 0,01` (`Math.abs(sum - total) === 0.01` deve retornar `false` em `isSplitSumExact` e falhar no `createInvoiceSchema`).
   - Rejeição de valores negativos (`-10`), zero (`0`), `NaN` e `Infinity`.
2. **Testes de Validação Zod & Contratos de Segurança**:
   - Verificação de que `createInvoiceSchema` rejeita itens cuja soma das cotas divirja em `R$ 0,01` ou `R$ 0,04` (que antes passavam pela brecha de `0.05`).
   - Verificação de que `src/app/login/page.tsx` não contém mais nenhuma senha em texto claro (`admin123` ou `obra123`).
   - Verificação de que `src/auth.ts` não contém segredo hardcoded irrestrito.
   - Verificação de compilação limpa `npx tsc --noEmit` (exit code `0`).

---

## 4. Handoff Formal para a Etapa 2

- **`senior-backend-eng`**: Executar Tarefas 1, 2, 3 e 4.
- **`senior-frontend-eng`**: Executar Tarefa 5.
- **`senior-qa-sdet`**: Executar a bateria de testes automatizados e emitir `APPROVED_BY_QA` (ou `QA_BLOCKED` se houver qualquer desvio).
