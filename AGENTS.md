<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Workspace Governance & Multi-Agent Architecture — Controle de Obra

## 1. Visão Geral da Equipe de Engenharia Sênior/Staff

O projeto **Controle de Obra** adota uma governança de engenharia de nível Staff/Principal composta por 5 perfis especializados, com responsabilidades delimitadas e portões de qualidade estritos (Hard Gates).

Cada agente possui definição canônica completa em `.agents/agents/<nome-do-agente>/agent.md` e espelho plano para descoberta automática em `.agents/agents/<nome-do-agente>.md`:

1. **`ciso-security-lead`** (Líder de Segurança da Informação & Staff AppSec Engineer):
   - Especialista em cibersegurança, OWASP Top 10, DevSecOps, RBAC com NextAuth v5, proteção contra SQLi/XSS/IDOR e proteção de segredos.
   - **Poder de Veto Absoluto (Hard Gate)**: Único agente autorizado a emitir o selo de certificação final `APPROVED_BY_SECURITY` ou rejeitar com `REJECTED_BY_SECURITY`. Seu veto é soberano e não pode ser ignorado ou sobreposto por nenhum outro papel.
   - Definição: [`.agents/agents/ciso-security-lead/agent.md`](.agents/agents/ciso-security-lead/agent.md) | [`.agents/agents/ciso-security-lead.md`](.agents/agents/ciso-security-lead.md)

2. **`tech-lead-architect`** (Tech Lead & Principal Software Architect):
   - Responsável por decompor demandas em tarefas atômicas, contratos de interface, Clean Architecture, DDD, separação estrita Server/Client Components e conformidade com Next.js 16.
   - Realiza o Code Review arquitetural obrigatório (Etapa 3), emitindo `APPROVED_BY_TECH_LEAD` ou `CHANGES_REQUESTED_BY_TECH_LEAD`.
   - Definição: [`.agents/agents/tech-lead-architect/agent.md`](.agents/agents/tech-lead-architect/agent.md) | [`.agents/agents/tech-lead-architect.md`](.agents/agents/tech-lead-architect.md)

3. **`senior-backend-eng`** (Staff Backend & Database Engineer):
   - Especialista em Server Actions (`"use server"`), Prisma ORM 6.5, PostgreSQL com precisão contábil `@db.Decimal(12, 2)`, transações atômicas com `prisma.$transaction` e validação Zod.
   - Submete obrigatoriamente toda entrega ao fluxo de validação de QA, Arquitetura e Segurança, não finalizando tarefas unilateralmente.
   - Definição: [`.agents/agents/senior-backend-eng/agent.md`](.agents/agents/senior-backend-eng/agent.md) | [`.agents/agents/senior-backend-eng.md`](.agents/agents/senior-backend-eng.md)

4. **`senior-frontend-eng`** (Senior Frontend & UI/UX Engineer):
   - Especialista em React 19, Next.js 16 App Router, Tailwind CSS v4 (estética *Warm Minimalism*), `react-hook-form` com resolvers Zod, máscaras monetárias BRL e acessibilidade WCAG AA.
   - Submete toda implementação ao fluxo formal de revisão de QA, Arquitetura e Segurança.
   - Definição: [`.agents/agents/senior-frontend-eng/agent.md`](.agents/agents/senior-frontend-eng/agent.md) | [`.agents/agents/senior-frontend-eng.md`](.agents/agents/senior-frontend-eng.md)

5. **`senior-qa-sdet`** (Senior QA & Automation Engineer / SDET):
   - Guardião da qualidade adversária, especialista em pirâmide de testes e em quebrar proativamente as implementações com edge cases contábeis (dízimas de rateio, centavos residuais, valores negativos, tentativas de bypass de role `ADMIN`/`PARTICIPANT` e condições de corrida).
   - Bloqueia o avanço imediatamente com `QA_BLOCKED` caso qualquer teste falhe ou aprova com `APPROVED_BY_QA`.
   - Definição: [`.agents/agents/senior-qa-sdet/agent.md`](.agents/agents/senior-qa-sdet/agent.md) | [`.agents/agents/senior-qa-sdet.md`](.agents/agents/senior-qa-sdet.md)

---

## 2. Pipeline Sequencial Obrigatório (Hard Gate)

Qualquer desenvolvimento no projeto (feature, refatoração, hotfix ou melhoria) deve obedecer estritamente ao pipeline em 4 etapas sequenciais:

```
1. Planejamento (tech-lead-architect)
      │
      ▼
2. Implementação (senior-backend-eng / senior-frontend-eng) + Testes Automatizados (senior-qa-sdet)
      │  (Requer APPROVED_BY_QA)
      ▼
3. Revisão Arquitetural (tech-lead-architect -> APPROVED_BY_TECH_LEAD)
      │  (Requer APPROVED_BY_TECH_LEAD)
      ▼
4. Auditoria de Segurança com Poder de Veto (ciso-security-lead -> APPROVED_BY_SECURITY)
      │
      ▼
 [ FEATURE CONCLUÍDA / DEFINITION OF DONE ]
```

Regra completa documentada em: [`.agents/rules/governance-workflow.md`](.agents/rules/governance-workflow.md).

---

## 3. Portões de Qualidade e Definition of Done (DoD)

Nenhuma tarefa pode ser considerada concluída no workspace sem possuir a comprovação textual dos **3 selos mandatórios** e compilação íntegra:

1. **`APPROVED_BY_QA`** (emitido por `senior-qa-sdet`)
2. **`APPROVED_BY_TECH_LEAD`** (emitido por `tech-lead-architect`)
3. **`APPROVED_BY_SECURITY`** (emitido por `ciso-security-lead`)
4. Compilação TypeScript limpa: `npx tsc --noEmit` executa com código de saída `0`.

Se `REJECTED_BY_SECURITY`, `QA_BLOCKED` ou `CHANGES_REQUESTED_BY_TECH_LEAD` for emitido, o avanço é **imediatamente interrompido** e o trabalho retorna à etapa correspondente com plano de correção.

---

## 4. Stack Técnica e Diretrizes Operacionais

- **Framework Web**: Next.js 16 (App Router) & React 19.
- **Estilização**: Tailwind CSS v4 com design system *Warm Minimalism* (`canvas #FAF8F5`, `surface #FFFFFF`, `terracotta #C26D53`, `sage #4D6B53`, `amber-warm #B8860B`, `border-warm #E6E1DA`, `ink #1C1917`).
- **Banco de Dados & ORM**: PostgreSQL gerenciado via Prisma ORM (`@prisma/client` 6.5) e contingência local (`.data/controle-obra-db.json`).
- **Precisão Financeira**: Armazenamento estrito em `@db.Decimal(12, 2)` e cálculos protegidos contra erros de ponto flutuante binário. Invariante: $\sum \text{ItemSplit.amountDue} \equiv \text{InvoiceItem.totalValue}$.
- **Autenticação & Autorização**: NextAuth v5 com verificação RBAC (`Role.ADMIN` vs `Role.PARTICIPANT`).
- **Validação de Dados**: Schemas Zod em todas as Server Actions e formulários.
- **Saúde do Repositório**: Toda modificação deve manter `npx tsc --noEmit` executando com código `0`.
