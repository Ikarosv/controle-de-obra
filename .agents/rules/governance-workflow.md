# Regras de Governança e Workflow de Engenharia — Controle de Obra

**Versão**: 1.0.0  
**Status**: Ativo / Mandatório (Hard Gate Inviolável)  
**Projeto**: Controle de Obra (Next.js 16 App Router, React 19, Tailwind CSS v4, Prisma 6.5, PostgreSQL, NextAuth v5, Zod 3.24)  
**Localização Canônica**: `.agents/rules/governance-workflow.md`  

---

## 1. Objetivo e Princípios Fundamentais

Este documento estabelece o protocolo de governança corporativa, orquestração e portões de qualidade (Quality Gates) obrigatórios para todas as modificações no código-fonte, infraestrutura, modelo de dados e interfaces do sistema **Controle de Obra**.

### Princípios Inegociáveis:
1. **Linearidade Rigorosa**: Nenhuma etapa do pipeline pode ser pulada ou executada fora da ordem predeterminada.
2. **Qualidade Adversária**: Toda entrega é submetida a testes que tentam ativamente quebrar a lógica de negócio e as invariantes contábeis antes de qualquer revisão.
3. **Soberania da Segurança (Hard Gate)**: O líder de segurança (`ciso-security-lead`) detém poder de veto absoluto sobre qualquer código.
4. **Triplo Selo de Qualidade**: Nenhuma feature, refatoração ou correção de bug é considerada pronta (*Definition of Done*) sem os três selos formais emitidos pelos respectivos agentes responsáveis.

---

## 2. Pipeline Sequencial Obrigatório (4 Etapas)

Toda demanda de desenvolvimento deve percorrer obrigatoriamente as 4 etapas sequenciais abaixo:

```
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 1: PLANEJAMENTO TÉCNICO E ARQUITETURA                │
│ Responsável: tech-lead-architect                           │
│ • Decomposição da demanda em tarefas atômicas               │
│ • Contratos de interface, Server Actions, Prisma e Zod     │
│ • Separação estrita Server vs Client Components            │
│ • Roteiro preliminar de testes para o SDET                 │
│ Saída: Especificação Técnica e Handoff Formal              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 2: IMPLEMENTAÇÃO + TESTES AUTOMATIZADOS (SDET)        │
│ Executores: senior-backend-eng / senior-frontend-eng        │
│ Guardião: senior-qa-sdet                                    │
│ • Backend: Server Actions, Prisma, Decimal(12,2), Zod       │
│ • Frontend: React 19, Tailwind v4 Warm Minimalism, WCAG AA  │
│ • QA: Pirâmide de testes, edge cases contábeis, RBAC        │
│ Decisão do SDET:                                            │
│   • Se falha/regressão/centavo divergente ──► QA_BLOCKED    │
│   • Se 100% dos testes e tipagem ok       ──► APPROVED_BY_QA│
└──────────────────────────────┬──────────────────────────────┘
                               │ (Requer APPROVED_BY_QA)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 3: REVISÃO ARQUITETURAL (CODE REVIEW)                 │
│ Responsável: tech-lead-architect                           │
│ • Avaliação de Clean Architecture e DDD                     │
│ • Zero Prisma/segredos em Client Components                 │
│ • Tipagem estrita TypeScript (npx tsc --noEmit exit 0)      │
│ Decisão do Tech Lead:                                       │
│   • Se desvio arquitetural ──► CHANGES_REQUESTED_BY_TECH_...│
│   • Se em conformidade     ──► APPROVED_BY_TECH_LEAD        │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Requer APPROVED_BY_TECH_LEAD)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 4: AUDITORIA DE SEGURANÇA COM PODER DE VETO           │
│ Responsável: ciso-security-lead                             │
│ • Auditoria OWASP Top 10 e Server Actions                   │
│ • Autenticação & Sessão NextAuth v5, RBAC ADMIN vs PARTICIP.│
│ • Prevenção de SQLi, XSS, CSRF, IDOR e vazamento de dados   │
│ Decisão do CISO (Poder de Veto Soberano):                   │
│   • Se vulnerabilidade de risco ──► REJECTED_BY_SECURITY    │
│   • Se 100% auditado e seguro   ──► APPROVED_BY_SECURITY    │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Requer APPROVED_BY_SECURITY)
                               ▼
            [ DEFINITION OF DONE ATINGIDA / CONCLUSÃO ]
```

### Detalhamento das Etapas:

### Etapa 1: Planejamento Técnico e Arquitetura
- **Agente Responsável**: `tech-lead-architect`.
- **Atividades**: Decompor o requisito em modelo de dados, contratos de Server Actions (`ActionResponse<T>`), componentes de interface e regras de rateio.
- **Saída**: Especificação técnica registrada e disponibilizada para os implementadores e QA.

### Etapa 2: Implementação e Testes Automatizados
- **Agentes Executores**: `senior-backend-eng` (persistência, schemas, regras de negócio) e `senior-frontend-eng` (UI, formulários, acessibilidade).
- **Agente Guardião**: `senior-qa-sdet` (testes automatizados, stress contábil e adversário).
- **Condição de Saída**: O `senior-qa-sdet` é o único que autoriza a saída desta etapa. Se emitir `QA_BLOCKED`, a implementação é devolvida imediatamente aos engenheiros executores. O avanço só ocorre com `APPROVED_BY_QA`.

### Etapa 3: Revisão Arquitetural (Code Review)
- **Agente Responsável**: `tech-lead-architect`.
- **Pré-requisito**: Existência prévia do selo `APPROVED_BY_QA`. O Tech Lead não revisa código com testes pendentes ou quebrados.
- **Atividades**: Inspecionar Clean Architecture, convenções Next.js 16, ausência de vazamento de I/O em componentes de cliente e conformidade com `npx tsc --noEmit`.
- **Condição de Saída**: Emissão exclusiva de `APPROVED_BY_TECH_LEAD` (avança) ou `CHANGES_REQUESTED_BY_TECH_LEAD` (retorna à Etapa 2).

### Etapa 4: Auditoria de Segurança com Poder de Veto
- **Agente Responsável**: `ciso-security-lead`.
- **Pré-requisitos**: Selos `APPROVED_BY_QA` e `APPROVED_BY_TECH_LEAD` cumulativamente concedidos.
- **Atividades**: Auditoria minuciosa contra vulnerabilidades OWASP Top 10, validação de Server Actions, sessão com NextAuth v5 e isolamento RBAC.
- **Condição de Saída**: Emissão soberana de `APPROVED_BY_SECURITY` ou veto sumário via `REJECTED_BY_SECURITY`.

---

## 3. Portões de Qualidade e Tabela Formal de Tokens (Hard Gates)

Os tokens abaixo são identificadores textuais imutáveis que regulam contratualmente as transições entre etapas:

| Token Formal | Agente Emissor Exclusivo | Significado / Condição de Disparo | Impacto no Fluxo |
|---|---|---|---|
| `APPROVED_BY_QA` | `senior-qa-sdet` | 100% dos testes passaram, compilação TypeScript limpa (`exit 0`), e edge cases financeiros validados. | Autoriza avanço para a Etapa 3 (Revisão Arquitetural). |
| `QA_BLOCKED` | `senior-qa-sdet` | Qualquer teste falhou, centavo divergente, quebra de tipagem ou ausência de cobertura crítica. | Bloqueio imediato. O código retorna aos desenvolvedores na Etapa 2. |
| `APPROVED_BY_TECH_LEAD` | `tech-lead-architect` | Código aprovado em Clean Architecture, separação Server/Client, boas práticas e tipagem estrita. | Autoriza avanço para a Etapa 4 (Auditoria de Segurança). |
| `CHANGES_REQUESTED_BY_TECH_LEAD` | `tech-lead-architect` | Desvio arquitetural, acoplamento indevido, código duplicado ou importação indevida de banco no cliente. | Bloqueio da etapa. Retorna à Etapa 2 com plano de refatoração obrigatório. |
| `APPROVED_BY_SECURITY` | `ciso-security-lead` | Código plenamente auditado, blindado contra OWASP Top 10, sem vazamento de dados e com RBAC intacto. | **Certificação Final**. A entrega é declarada concluída. |
| `REJECTED_BY_SECURITY` | `ciso-security-lead` | **Poder de Veto Acionado**. Vulnerabilidade de segurança identificada (ex: bypass de role, IDOR, SQLi, injeção, secret exposto). | **Veto Absoluto**. Paralisa o fluxo e retorna imediatamente à Etapa 2 (ou Etapa 1 se falha de design). |

---

## 4. Cláusula de Soberania do Veto de Segurança (Hard Gate Inviolável)

1. O subagente `ciso-security-lead` detém poder de veto **absoluto e inquestionável** sobre todo o ciclo de vida de desenvolvimento do sistema Controle de Obra.
2. Nenhum outro agente, líder técnico, arquiteto ou desenvolvedor possui autoridade para desconsiderar, sobrescrever ou contornar uma emissão de `REJECTED_BY_SECURITY`.
3. Todo apontamento de segurança classificado com severidade Alta ou Crítica é impeditivo.
4. Qualquer tentativa de ignorar um veto do CISO constitui violação direta de integridade e invalidará imediatamente toda a entrega.

---

## 5. Matriz RACI da Engenharia

| Papel / Agente | Etapa 1: Planejamento | Etapa 2: Implementação | Etapa 2: Testes (QA) | Etapa 3: Revisão Arq. | Etapa 4: Auditoria CISO |
|---|:---:|:---:|:---:|:---:|:---:|
| `tech-lead-architect` | **A / R** | C | C | **A / R** | C |
| `senior-backend-eng` | C | **R (Backend)** | I | I | I |
| `senior-frontend-eng` | C | **R (Frontend)** | I | I | I |
| `senior-qa-sdet` | C | I | **A / R** | I | I |
| `ciso-security-lead` | C | I | I | I | **A / R (Veto Soberano)** |

*Legenda:*
- **R (Responsible)**: Agente executor responsável pela realização técnica da etapa.
- **A (Accountable)**: Agente com autoridade formal de decisão, aprovação ou veto sobre a etapa.
- **C (Consulted)**: Agente consultado para fornecer subsídios técnicos e requisitos.
- **I (Informed)**: Agente informado do status e dos resultados das transições.

---

## 6. Diretrizes Técnicas Específicas do Domínio Controle de Obra

### 6.1 Precisão Financeira Estrita & Invariantes de Rateio
- **Precisão Contábil**: Todos os valores monetários no banco de dados utilizam `@db.Decimal(12, 2)` no Prisma e PostgreSQL.
- **Aritmética Segura**: É terminantemente proibido utilizar o tipo primitivo `number` do JavaScript para cálculos contábeis acumulados. Utilizar `Prisma.Decimal` ou aritmética de centavos inteiros (`BigInt`).
- **Invariante de Soma**: Em todo item de nota (`InvoiceItem`), a soma dos valores devidos em `ItemSplit.amountDue` deve ser estritamente igual a `InvoiceItem.totalValue`:
  $$\sum_{i=1}^{n} \text{amountDue}_i \equiv \text{totalValue}$$
- **Tratamento de Dízimas**: Em divisões onde a conta não é exata em duas casas decimais (ex: R$ 100,00 entre 3 participantes), o centavo residual deve ser alocado de forma determinística e transparente (ex: R$ 33,34 para o primeiro cotista e R$ 33,33 para os demais).

### 6.2 Transações Atômicas (`prisma.$transaction`)
- Operações que alteram mais de uma tabela de forma correlacionada (ex: criação de `Invoice` com múltiplos `InvoiceItem`s e respectivos `ItemSplit`s) devem obrigatoriamente ser executadas dentro de uma transação atômica (`prisma.$transaction`).
- Se houver falha em qualquer item ou split, a operação inteira deve sofrer rollback sem deixar registros órfãos.

### 6.3 Controle de Acesso Baseado em Papéis (RBAC)
- O sistema possui dois perfis definidos no enum `Role`: `ADMIN` e `PARTICIPANT`.
- Toda Server Action deve verificar a autenticação com `const session = await auth();`.
- Operações administrativas (criação/edição/exclusão de categorias, etapas, notas fiscais e usuários) exigem `session.user.role === "ADMIN"` ou `requireAdmin()`.
- Participantes (`PARTICIPANT`) só podem visualizar relatórios autorizados e liquidar suas próprias cotas (`ItemSplit.userId === session.user.id`).

### 6.4 Arquitetura Next.js 16 e Design System Warm Minimalism
- **Server Components**: Páginas e layouts buscam dados de forma assíncrona no servidor com zero JavaScript desnecessário no client bundle.
- **Client Components**: Restritos a componentes que necessitam de eventos de browser e formulários reativos via `"use client"`.
- **Warm Minimalism**: Aplicação fiel dos tokens de design terrosos no Tailwind CSS v4 (`canvas #FAF8F5`, `surface #FFFFFF`, `terracotta #C26D53`, `sage #4D6B53`, `amber-warm #B8860B`, `border-warm #E6E1DA`, `ink #1C1917`).
- **Acessibilidade**: Conformidade com padrão WCAG 2.1 AA (contraste > 4.5:1, foco visível, navegação completa por teclado).

---

## 7. Definition of Done (DoD) — Regra do Triplo Selo

Nenhuma demanda (história de usuário, melhoria, correção de defeito ou refatoração) é considerada finalizada ou aceita no repositório sem atender cumulativamente aos seguintes critérios:

- [ ] **1. Implementação Completa**: Código implementado atendendo integralmente às especificações da Etapa 1.
- [ ] **2. Compilação TypeScript Limpa**: O comando `npx tsc --noEmit` executa sem nenhum erro (exit code 0).
- [ ] **3. Selo de Qualidade e Testes (Etapa 2)**: Emissão formal do token `APPROVED_BY_QA` pelo `senior-qa-sdet`.
- [ ] **4. Selo de Revisão Arquitetural (Etapa 3)**: Emissão formal do token `APPROVED_BY_TECH_LEAD` pelo `tech-lead-architect`.
- [ ] **5. Selo de Auditoria de Segurança (Etapa 4)**: Emissão formal do token `APPROVED_BY_SECURITY` pelo `ciso-security-lead`.
- [ ] **6. Inexistência de Vetos**: Nenhum status `REJECTED_BY_SECURITY`, `QA_BLOCKED` ou `CHANGES_REQUESTED_BY_TECH_LEAD` pendente.
