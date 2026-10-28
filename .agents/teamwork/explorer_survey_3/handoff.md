# Handoff Report: Governance & Discovery Architecture Analysis

**Agent**: `explorer_survey_3` (Governance & Discovery Architecture Explorer)  
**Parent Agent**: `2c787fe4-ea0b-41cd-af88-77a922c6fd46` (Orchestrator)  
**Date/Timestamp**: 2026-10-26T21:22:00Z  
**Target Milestone**: Survey & Reconnaissance -> Milestones M1 & M2 Preparation  
**Scope**: Governance Workflow Pipeline, Portões de Qualidade (Hard Gates) & Tokens, Integração com `AGENTS.md` (preservando bloco Next.js), Arquitetura de Descoberta Dupla (`.agents/agents/<nome>/agent.md` e `.agents/agents/<nome>.md`), e Regras Formais em `.agents/rules/governance-workflow.md`.

---

## 1. Observation

### 1.1 Requirements from `ORIGINAL_REQUEST.md`
Direct observations from `c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\ORIGINAL_REQUEST.md`:
- **Line 5**: "Estruturar e criar a arquitetura completa de 5 subagentes de engenharia Sênior/Staff e regras de governança para o projeto **Controle de Obra** (Next.js 16 App Router, Tailwind CSS v4, Prisma/PostgreSQL, NextAuth v5 e Zod), gerando os arquivos de definição em `.agents/agents/<nome-do-agente>/agent.md` (e equivalentes de descoberta `.agents/agents/<nome-do-agente>.md` e `.agents/rules/governance-workflow.md`)."
- **Lines 14-18**: Five specialized profiles:
  1. `ciso-security-lead`: "Possui **poder de veto absoluto (Hard Gate)** e é o único autorizado a emitir o selo `APPROVED_BY_SECURITY` ou reprovar com `REJECTED_BY_SECURITY` + relatório técnico acionável."
  2. `tech-lead-architect`: "Realiza o Code Review arquitetural antes do envio à segurança, emitindo `APPROVED_BY_TECH_LEAD` ou `CHANGES_REQUESTED_BY_TECH_LEAD`."
  3. `senior-backend-eng`: "Especialista em Server Actions, Prisma ORM, PostgreSQL (`Decimal(12,2)` para precisão financeira)... Deve obrigatoriamente acionar QA, Tech Lead e CISO antes de encerrar qualquer entrega."
  4. `senior-frontend-eng`: "Especialista em React 19, Next.js 16 App Router, Tailwind v4 (estética Warm Minimalism)... Submete todas as entregas ao fluxo de revisão de QA, Arquitetura e Segurança."
  5. `senior-qa-sdet`: "Especialista em pirâmide de testes... edge cases financeiros (dízimas de rateio, centavos faltantes, payloads malformados, bypass de role `ADMIN`/`PARTICIPANT` e condições de corrida). Bloqueia o avanço caso qualquer teste falhe (`QA_BLOCKED`) ou aprova com `APPROVED_BY_QA`."
- **Lines 20-23**: Mandatory 4-stage pipeline:
  `1. Planejamento (tech-lead-architect) -> 2. Implementação (senior-backend-eng / senior-frontend-eng) + Testes Automatizados (senior-qa-sdet) -> 3. Revisão Arquitetural (tech-lead-architect: APPROVED_BY_TECH_LEAD) -> 4. Auditoria e Aprovação Final de Segurança com Poder de Veto (ciso-security-lead: APPROVED_BY_SECURITY)`.
  "Nenhuma tarefa pode ser considerada pronta sem os três selos formais (`APPROVED_BY_QA`, `APPROVED_BY_TECH_LEAD` e `APPROVED_BY_SECURITY`)."
- **Line 41**: "O projeto existente continua íntegro (`npx tsc --noEmit` executa com código de saída `0`)."

### 1.2 Existing `AGENTS.md` File Content
Inspection of `c:\Users\ikaro\Workspace\Controle De Obra\AGENTS.md` (Lines 1 to 10):
```markdown
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
```
Verbatim evidence: Lines 1-9 contain the auto-generated Next.js 16 agent rules block. Line 7 confirms `next dev` rewrites and checks this block. Modifying or deleting this block will cause repository churn.

### 1.3 Baseline Project & Stack Verification
- `package.json` dependencies:
  - `next`: `^16.0.0`
  - `react`: `^19.0.0`
  - `next-auth`: `5.0.0-beta.25`
  - `prisma`: `^6.5.0`
  - `@prisma/client`: `^6.5.0`
  - `tailwindcss`: `^4.1.4`
  - `zod`: `^3.24.3`
  - `typescript`: `^5.8.3`
- `prisma/schema.prisma` models and enums:
  - `enum Role { ADMIN, PARTICIPANT }` (Lines 12-15)
  - `enum SplitStatus { PENDING, PAID }` (Lines 17-20)
  - `Category.budgetLimit`: `Decimal? @db.Decimal(12,2)` (Line 42)
  - `StageBudget.budgetLimit`: `Decimal @db.Decimal(12,2)` (Line 53)
  - `InvoiceItem.totalValue`: `Decimal @db.Decimal(12,2)` (Line 89)
  - `ItemSplit.amountDue`: `Decimal @db.Decimal(12,2)` (Line 107)
- Tool execution: `run_command: npx tsc --noEmit` executed on workspace root exited with code `0`, clean stdout and stderr.
- Current `.agents/` filesystem status: contains only `teamwork/` directory. Directories `.agents/agents/` and `.agents/rules/` do not exist yet.

---

## 2. Logic Chain

### 2.1 Sequential Governance Pipeline Architecture
From the mandatory flow defined in R2:
```
[Demanda/Feature]
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 1: PLANEJAMENTO TÉCNICO E ARQUITETURA                │
│ Responsável: tech-lead-architect                           │
│ - Decomposição atômica de tarefas                           │
│ - Definição de contratos (Server Actions, Prisma, Zod)      │
│ - Separação Client/Server Components & Clean Architecture   │
│ - Matriz de testes preliminar para QA                       │
│ Saída: Especificação Técnica e Critérios de Aceite          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 2: IMPLEMENTAÇÃO + TESTES AUTOMATIZADOS (SDET)        │
│ Responsáveis: senior-backend-eng / senior-frontend-eng      │
│               + senior-qa-sdet                              │
│ - Backend: Prisma, Decimal(12,2), Zod, Server Actions       │
│ - Frontend: React 19, Tailwind v4 Warm Minimalism, WCAG AA  │
│ - QA: Pirâmide de testes, edge cases financeiros, RBAC      │
│ Decisão SDET:                                               │
│   • Se falha/regressão ────────► Emite QA_BLOCKED (Retorna) │
│   • Se 100% aprovado   ────────► Emite APPROVED_BY_QA       │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Requer APPROVED_BY_QA)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 3: REVISÃO ARQUITETURAL (CODE REVIEW)                 │
│ Responsável: tech-lead-architect                           │
│ - Validação de DDD, Clean Architecture e convenções Next 16 │
│ - Verificação de separação Client/Server                    │
│ - Zero regressões arquiteturais / tipos estritos            │
│ Decisão Tech Lead:                                          │
│   • Se desvio arquitetural ────► Emite CHANGES_REQUESTED... │
│   • Se em conformidade     ────► Emite APPROVED_BY_TECH_LEAD│
└──────────────────────────────┬──────────────────────────────┘
                               │ (Requer APPROVED_BY_TECH_LEAD)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ ETAPA 4: AUDITORIA DE SEGURANÇA COM PODER DE VETO           │
│ Responsável: ciso-security-lead                             │
│ - OWASP Top 10, Server Actions como endpoints públicos      │
│ - Autenticação & Sessão NextAuth v5, RBAC ADMIN vs PARTICIP.│
│ - Sanitização, SQLi, CSRF, XSS, gestão de secrets           │
│ Decisão CISO (Poder de Veto Absoluto):                      │
│   • Se vulnerabilidade     ────► Emite REJECTED_BY_SECURITY │
│   • Se 100% seguro         ────► Emite APPROVED_BY_SECURITY │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Requer APPROVED_BY_SECURITY)
                               ▼
                    [ FEATURE CONCLUÍDA / DOD ]
```

**Justificativa de Linearidade**:
1. Não há implementação sem planejamento prévio: evita retrabalho, inconsistência de esquemas de banco e divergência nos contratos de Server Actions.
2. Não há revisão arquitetural sem testes passando: o Tech Lead não deve gastar tempo revisando código quebrado ou sem cobertura de edge cases. O selo `APPROVED_BY_QA` é pré-condição estrita.
3. Não há auditoria de segurança em código não aprovado pelo Tech Lead: a segurança analisa código estruturalmente estável e maduro.
4. O CISO possui a última palavra: nenhum código chega à produção sem o selo de segurança.

### 2.2 Quality Gates & Protocolo Formal de Tokens
Para eliminar ambiguidades em pipelines automatizados de múltiplos agentes, definimos uma máquina de estados baseada em tokens textuais imutáveis:

| Token Formal | Agente Emissor Exclusivo | Significado / Condição de Disparo | Impacto no Pipeline |
|---|---|---|---|
| `APPROVED_BY_QA` | `senior-qa-sdet` | Todos os testes unitários, de integração e edge cases financeiros (dízimas, centavos, concorrência, RBAC) passaram com sucesso no terminal. | Desbloqueia o avanço para a Etapa 3 (Revisão Arquitetural). |
| `QA_BLOCKED` | `senior-qa-sdet` | Qualquer falha de teste, discrepância de arredondamento financeiro, quebra de tipagem ou ausência de cobertura. | Bloqueio imediato. O trabalho retorna aos engenheiros executores na Etapa 2. |
| `APPROVED_BY_TECH_LEAD` | `tech-lead-architect` | Código revisado e aprovado quanto a Clean Architecture, Next.js 16 Server/Client components, manutenibilidade e performance. | Desbloqueia o avanço para a Etapa 4 (Auditoria de Segurança). |
| `CHANGES_REQUESTED_BY_TECH_LEAD` | `tech-lead-architect` | Desvios arquiteturais, código duplicado, violação de DDD, acoplamento indevido ou importação de banco em componentes de cliente. | Bloqueio da etapa. Retorna à Etapa 2 com parecer técnico e punchlist prioritária. |
| `APPROVED_BY_SECURITY` | `ciso-security-lead` | Auditoria de segurança concluída com sucesso. Zero vulnerabilidades críticas/altas, RBAC verificado, Server Actions protegidas. | Selo final de conclusão. Feature é declarada **PRONTA (DONE)**. |
| `REJECTED_BY_SECURITY` | `ciso-security-lead` | **Poder de Veto Acionado**. Vulnerabilidade de segurança detectada (ex: bypass de role, injeção, falha de sessão, segredo exposto). | Bloqueio absoluto. Nenhum agente pode ignorar ou sobrepor. Retorna para Etapa 2 (ou Etapa 1 se falha de design). |

**Regra de Ouro da Definition of Done (DoD)**:
Uma entrega só é aceita no repositório se apresentar cumulativamente:
1. `APPROVED_BY_QA`
2. `APPROVED_BY_TECH_LEAD`
3. `APPROVED_BY_SECURITY`
4. Execução limpa do compilador (`npx tsc --noEmit` exit code 0).

### 2.3 Arquitetura de Descoberta Dupla (Dual Discovery Equivalents)
O requisito solicita:
- Caminho Primário: `.agents/agents/<nome-do-agente>/agent.md`
- Equivalente de Descoberta: `.agents/agents/<nome-do-agente>.md`

**Por que a arquitetura exige ambos?**
1. **Diversidade de Ferramentas e Frameworks**: Diferentes ferramentas de orquestração de IA (Cline, Roo Code, Claude Code, Cursor, OpenHands, AutoGen) utilizam estratégias distintas de discovery:
   - Scanners baseados em pacotes buscam subdiretórios com arquivos `agent.md` (permitindo anexar no mesmo diretório arquivos de suporte como `tools.json`, `rules.md` ou exemplos).
   - Scanners baseados em arquivos planos buscam arquivos Markdown diretamente na raiz da pasta `.agents/agents/*.md`.
2. **Ambiente Windows e Portabilidade**:
   - Em sistemas POSIX (Linux/macOS), seria comum criar links simbólicos (`symlinks`).
   - Porém, no **Windows** (sistema operacional em uso neste workspace), a criação de symlinks via Node ou Git exige privilégios administrativos elevados (`SeCreateSymbolicLinkPrivilege`) ou ativação do Modo de Desenvolvedor no registro do Windows. A tentativa de criar symlinks por ferramentas de IA em ambientes Windows comuns frequentemente dispara exceções `EPERM` ou corrompe o clone em outros ambientes.
3. **Solução Recomendada**:
   - Criação direta e síncrona dos arquivos equivalentes contendo exatamente o mesmo conteúdo (espelhamento idempotente).
   - O arquivo `.agents/agents/<nome-do-agente>/agent.md` atua como a definição canônica de pacote, e o arquivo `.agents/agents/<nome-do-agente>.md` atua como a definição plana para compatibilidade total.

### 2.4 Integração em `AGENTS.md` Preservando o Bloco Next.js
O arquivo `AGENTS.md` na raiz do repositório é lido por agentes e ferramentas ao interagir com o workspace.
- **Restrição Estrita**: O bloco `<!-- BEGIN:nextjs-agent-rules -->` até `<!-- END:nextjs-agent-rules -->` deve ser mantido 100% inalterado no topo do arquivo.
- **Estratégia de Integração**:
  Manter o bloco existente nas primeiras linhas, inserir um divisor temático claro (`---`) e adicionar as diretrizes de governança do workspace:
  - Apresentação da equipe de 5 subagentes Sênior/Staff.
  - Regra de ouro do pipeline sequencial (Planejamento -> Implementação/Testes -> Revisão Tech Lead -> Auditoria CISO).
  - Tabela de tokens formais e Definition of Done (3 selos obrigatórios).
  - Catálogo de links de descoberta para `.agents/agents/` e referência a `.agents/rules/governance-workflow.md`.
  - Diretrizes técnicas da stack (Next.js 16, React 19, Prisma, PostgreSQL Decimal(12,2), Tailwind v4 Warm Minimalism, NextAuth v5, Zod).

### 2.5 Estrutura Formal de `.agents/rules/governance-workflow.md`
Este arquivo centraliza a governança corporativa da engenharia. Deve ser estruturado em seções exaustivas:
1. `Metadados e Declaração de Autoridade` (Versão, Data, Status, Escopo).
2. `Pipeline Sequencial Obrigatório (4 Etapas)`: Detalhamento rigoroso de cada etapa, entradas, saídas e responsáveis.
3. `Portões de Qualidade e Tokens Formais (Hard Gates)`: Tabela de tokens, significado, ações de transição.
4. `Poder de Veto de Segurança (Hard Gate Inviolável)`: Cláusula de soberania do CISO.
5. `Matriz RACI dos Papéis de Engenharia`:
   - `tech-lead-architect`: Responsible no Planejamento e Revisão; Consulted nos demais.
   - `senior-backend-eng`: Responsible na Implementação de Backend; Consulted no Planejamento.
   - `senior-frontend-eng`: Responsible na Implementação de Frontend; Consulted no Planejamento.
   - `senior-qa-sdet`: Responsible nos Testes e Validação de Edge Cases; Accountable pelo selo QA.
   - `ciso-security-lead`: Responsible e Accountable pela Auditoria de Segurança; Veto Sovereign.
6. `Checklist e Matriz de Edge Cases Financeiros`:
   - Precisão `Decimal(12,2)` do PostgreSQL via Prisma.
   - Algoritmo de divisão de centavos em rateios de notas fiscais (`ItemSplit`) sem perda ou criação de centavos.
   - Validação de autorização RBAC (`ADMIN` vs `PARTICIPANT`).
7. `Protocolo de Comunicação e Handoff Entre Agentes`:
   - Formato padronizado de relatórios de handoff.
8. `Definition of Done (DoD)`: Lista de checagem final mandatória.

---

## 3. Caveats

1. **Restrições de Links Simbólicos no Windows**: Conforme analisado, a criação de symlinks no Windows via script pode falhar por falta de privilégios (`EPERM`). A implementação deve gerar os arquivos de descoberta plana `.agents/agents/<nome-do-agente>.md` diretamente como conteúdo espelhado idêntico ao `.agents/agents/<nome-do-agente>/agent.md`.
2. **Ambiente de Testes Automatizados no `package.json`**: O repositório atualmente não possui o script `"test"` configurado em `package.json` (apenas `dev`, `build`, `start`, `lint`, `db:generate`, `db:push`, `db:seed`). Durante a implementação dos testes pelo `senior-qa-sdet`, os testes podem ser executados via `tsx` ou um runner compatível, mantendo `npx tsc --noEmit` como validador de tipagem e integridade.
3. **Preservação Automática do Bloco Next.js**: O comando `next dev` monitora e reescreve automaticamente o bloco `nextjs-agent-rules` em `AGENTS.md` caso seu conteúdo ou delimitadores sejam corrompidos. Portanto, qualquer alteração deve manter as linhas 1 a 9 estritamente intactas.

---

## 4. Conclusion & Actionable Blueprint for Implementation

Esta investigação estabelece o blueprint exato e pronto para ser executado pelas fases subsequentes de implementação (Milestones M1 e M2).

### 4.1 Proposta Detalhada de `.agents/rules/governance-workflow.md`
Abaixo está o conteúdo integral projetado para o arquivo de governança:

```markdown
# Regras de Governança e Workflow de Engenharia — Controle de Obra

**Versão**: 1.0.0  
**Status**: Ativo / Mandatório (Hard Gate)  
**Projeto**: Controle de Obra (Next.js 16, React 19, Tailwind CSS v4, Prisma, PostgreSQL, NextAuth v5, Zod)  
**Localização**: `.agents/rules/governance-workflow.md`

---

## 1. Objetivo e Princípios Fundamentais

Este documento estabelece o protocolo de orquestração e os portões de qualidade (Quality Gates) obrigatórios para todas as alterações no código-fonte, infraestrutura, modelo de dados e interfaces do sistema **Controle de Obra**.

Nenhum código é considerado concluído ou passível de deploy em produção sem cumprir rigorosamente o fluxo sequencial de 4 etapas e obter a tríplice aprovação formal.

---

## 2. Pipeline Sequencial Obrigatório (4 Etapas)

Toda demanda (feature, refatoração, correção de bug ou melhoria de performance) deve percorrer obrigatoriamente as 4 etapas sequenciais abaixo:

### Etapa 1: Planejamento Técnico e Arquitetura
- **Agente Responsável**: `tech-lead-architect` (Tech Lead & Principal Architect).
- **Atividades**:
  - Decomposição da demanda em tarefas atômicas e especificações técnicas.
  - Definição da arquitetura (Clean Architecture, DDD, isolamento de Server e Client Components).
  - Definição de contratos de dados (Prisma schema, migrations, schemas de validação Zod).
  - Definição de contratos de Server Actions (parâmetros, tipagem de retorno e tratamento de erros).
  - Definição da matriz de testes preliminar e edge cases críticos para o time de QA.
- **Saída**: Especificação Técnica e Handoff para Implementação e QA.

### Etapa 2: Implementação e Testes Automatizados
- **Agentes Responsáveis**:
  - `senior-backend-eng`: Implementação de Server Actions, lógica de negócio, transações atômicas no Prisma e precisão `Decimal(12,2)`.
  - `senior-frontend-eng`: Componentes React 19, App Router, formulários `react-hook-form` com Zod, estética Warm Minimalism com Tailwind v4 e acessibilidade WCAG AA.
  - `senior-qa-sdet`: Elaboração e execução da pirâmide de testes automatizados (unitários, integração e E2E) e cobertura de edge cases financeiros e permissões.
- **Portão de Saída (SDET Gate)**:
  - Se houver qualquer teste com falha ou regressão: O QA emite obrigatoriamente `QA_BLOCKED` detalhando a falha. A etapa NÃO avança.
  - Se 100% dos testes e verificações passarem: O QA emite `APPROVED_BY_QA`.

### Etapa 3: Revisão Arquitetural (Code Review)
- **Agente Responsável**: `tech-lead-architect`.
- **Pré-requisito Mandatório**: Selo `APPROVED_BY_QA` concedido na Etapa 2.
- **Atividades**:
  - Code Review detalhado avaliando conformidade com o plano inicial e princípios de Clean Code.
  - Verificação da fronteira Server vs Client Components (zero importação de Prisma em arquivos `'use client'`, uso correto de Server Actions).
  - Validação de tipagem estrita no TypeScript (nenhum uso de `any`, compilação `npx tsc --noEmit` limpa).
- **Decisão do Tech Lead**:
  - Se houver inconformidade: Emite `CHANGES_REQUESTED_BY_TECH_LEAD` com lista de ajustes obrigatórios (retorna à Etapa 2).
  - Se aprovado: Emite `APPROVED_BY_TECH_LEAD` e encaminha a entrega para auditoria de segurança.

### Etapa 4: Auditoria de Segurança com Poder de Veto
- **Agente Responsável**: `ciso-security-lead` (Líder de Segurança da Informação / Staff AppSec).
- **Pré-requisitos Mandatórios**: Selos `APPROVED_BY_QA` E `APPROVED_BY_TECH_LEAD`.
- **Atividades**:
  - Análise aprofundada de vulnerabilidades com base no OWASP Top 10.
  - Auditoria de autenticação e sessão com NextAuth v5 (`auth()`).
  - Auditoria estrita de autorização RBAC (`ADMIN` vs `PARTICIPANT`) em cada Server Action.
  - Validação de proteção contra SQL Injection (queries parametrizadas no Prisma), XSS e CSRF.
  - Verificação de proteção de segredos e conformidade com variáveis de ambiente.
- **Poder de Veto e Decisão do CISO**:
  - **Poder de Veto Absoluto**: O CISO tem soberania total. Nenhuma autoridade (nem Tech Lead nem gerência) pode sobrepor um veto de segurança.
  - Se vulnerabilidade identificada: Emite `REJECTED_BY_SECURITY` acompanhado de relatório de risco (CVE-style) com correções obrigatórias.
  - Se aprovado: Emite `APPROVED_BY_SECURITY`.

---

## 3. Portões de Qualidade e Tokens Formais (Hard Gates)

Os tokens abaixo são identificadores contratuais imutáveis que regulam o avanço de qualquer entrega:

| Token | Agente Emissor | Condição | Ação no Workflow |
|---|---|---|---|
| `APPROVED_BY_QA` | `senior-qa-sdet` | Todos os testes passaram e edge cases foram validados. | Autoriza avanço para Revisão do Tech Lead (Etapa 3). |
| `QA_BLOCKED` | `senior-qa-sdet` | Falha em testes, bug financeiro, centavo divergente ou quebra de tipagem. | Interrompe o avanço. Engenheiros corrigem na Etapa 2. |
| `APPROVED_BY_TECH_LEAD` | `tech-lead-architect` | Código aprovado em arquitetura, boas práticas e tipagem. | Autoriza avanço para Auditoria do CISO (Etapa 4). |
| `CHANGES_REQUESTED_BY_TECH_LEAD` | `tech-lead-architect` | Desvio arquitetural, acoplamento indevido ou falta de aderência técnica. | Retorna a entrega à Etapa 2 para refatoração. |
| `APPROVED_BY_SECURITY` | `ciso-security-lead` | Código auditado, seguro, livre de falhas OWASP e com RBAC íntegro. | **Certificação Final**. A entrega é declarada concluída. |
| `REJECTED_BY_SECURITY` | `ciso-security-lead` | Vulnerabilidade de segurança detectada. | **Veto Absoluto**. Retorna imediatamente à Etapa 2 ou 1. |

---

## 4. Matriz RACI da Engenharia

| Papel / Agente | Etapa 1: Planejamento | Etapa 2: Implementação | Etapa 2: Testes (QA) | Etapa 3: Revisão Arq. | Etapa 4: Auditoria CISO |
|---|:---:|:---:|:---:|:---:|:---:|
| `tech-lead-architect` | **A / R** | C | C | **A / R** | C |
| `senior-backend-eng` | C | **R (Backend)** | I | I | I |
| `senior-frontend-eng` | C | **R (Frontend)** | I | I | I |
| `senior-qa-sdet` | C | I | **A / R** | I | I |
| `ciso-security-lead` | C | I | I | I | **A / R (Veto)** |

*Legenda: R = Responsible (Executor); A = Accountable (Aprovador/Autoridade); C = Consulted (Consultado); I = Informed (Informado).*

---

## 5. Diretrizes Específicas do Domínio Controle de Obra

1. **Precisão Financeira Estrita**:
   - Todo valor monetário nos modelos Prisma (`Category.budgetLimit`, `StageBudget.budgetLimit`, `InvoiceItem.totalValue`, `ItemSplit.amountDue`) é armazenado como `Decimal(12,2)`.
   - É expressamente proibido usar ponto flutuante binário (`number` do JS) para operações aritméticas monetárias. Utilizar bibliotecas de precisão decimal ou manipulação em centavos inteiros (`BigInt`/`cents`).
   - Rateio de notas fiscais: A soma dos `amountDue` de todos os `ItemSplit` deve ser **estritamente idêntica** ao `totalValue` do `InvoiceItem`. Centavos residuais devem ser alocados com determinismo transparente.
2. **Autorização RBAC em Server Actions**:
   - Cada Server Action deve iniciar com a validação da sessão (`const session = await auth();`).
   - Mutações administrativas (ex: criação/edição de fornecedores, categorias, orçamentos de etapas e exclusão de notas) devem validar `if (session.user.role !== 'ADMIN') throw new Error('Acesso negado');`.
   - Usuários com role `PARTICIPANT` só podem visualizar dados e alterar o status de seus próprios splits atribuídos.
3. **Padrões Next.js 16 e React 19**:
   - Diretiva `'use client'` estritamente contida nas folhas da árvore de componentes (interações e formulários).
   - Componentes de layout e páginas que buscam dados devem ser Server Components assíncronos.
   - Schemas Zod devem validar entradas antes de tocar no banco de dados.

---

## 6. Definition of Done (DoD)

Uma tarefa só está concluída quando:
- [ ] Implementação de acordo com os requisitos e padrões arquiteturais.
- [ ] Código compilando com sucesso (`npx tsc --noEmit` exit 0).
- [ ] Emissão do selo `APPROVED_BY_QA` pelo `senior-qa-sdet`.
- [ ] Emissão do selo `APPROVED_BY_TECH_LEAD` pelo `tech-lead-architect`.
- [ ] Emissão do selo `APPROVED_BY_SECURITY` pelo `ciso-security-lead`.
- [ ] Nenhum veto ou pendência em aberto.
```

---

### 4.2 Proposta de Integração em `AGENTS.md`
Abaixo está o conteúdo projetado para `AGENTS.md`, preservando intacto o bloco Next.js:

```markdown
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Workspace Governance & Multi-Agent Architecture — Controle de Obra

## 1. Visão Geral da Arquitetura de Agentes

O projeto **Controle de Obra** adota uma governança de engenharia de nível Staff/Principal composta por 5 perfis especializados com responsabilidades delimitadas e portões de qualidade rígidos (Hard Gates).

As especificações canônicas dos agentes residem em `.agents/agents/<nome-do-agente>/agent.md` e contam com equivalentes planos de descoberta em `.agents/agents/<nome-do-agente>.md`:
1. **`ciso-security-lead`**: Líder de Segurança da Informação & Staff AppSec Engineer. Possui **poder de veto absoluto**. Emite `APPROVED_BY_SECURITY` ou `REJECTED_BY_SECURITY`.
2. **`tech-lead-architect`**: Tech Lead & Principal Software Architect. Define padrões, Clean Architecture, DDD e realiza revisão arquitetural. Emite `APPROVED_BY_TECH_LEAD` ou `CHANGES_REQUESTED_BY_TECH_LEAD`.
3. **`senior-backend-eng`**: Staff Backend & Database Engineer. Especialista em Server Actions, Prisma ORM, PostgreSQL `Decimal(12,2)` e validação estrita com Zod.
4. **`senior-frontend-eng`**: Senior Frontend & UI/UX Engineer. Especialista em React 19, Next.js 16 App Router, Tailwind CSS v4 (*Warm Minimalism*), `react-hook-form` e acessibilidade WCAG AA.
5. **`senior-qa-sdet`**: Senior QA & Automation Engineer. Responsável pela pirâmide de testes e validação de edge cases financeiros e permissões RBAC. Emite `APPROVED_BY_QA` ou `QA_BLOCKED`.

---

## 2. Pipeline Sequencial Obrigatório (Hard Gate)

Qualquer desenvolvimento no projeto deve obedecer obrigatoriamente ao pipeline em 4 etapas:
`1. Planejamento (tech-lead-architect) -> 2. Implementação (senior-backend-eng / senior-frontend-eng) + Testes (senior-qa-sdet) -> 3. Revisão Arquitetural (tech-lead-architect) -> 4. Auditoria de Segurança com Poder de Veto (ciso-security-lead)`

Regra integral documentada em: [`.agents/rules/governance-workflow.md`](.agents/rules/governance-workflow.md).

---

## 3. Portões de Qualidade e Definition of Done (DoD)

Nenhuma tarefa pode ser considerada concluída no workspace sem possuir a comprovação textual dos **3 selos mandatórios**:
1. `APPROVED_BY_QA`
2. `APPROVED_BY_TECH_LEAD`
3. `APPROVED_BY_SECURITY`

Se `REJECTED_BY_SECURITY` ou `QA_BLOCKED` for emitido, o avanço é **imediatamente interrompido** e o trabalho retorna à etapa correspondente.

---

## 4. Stack Técnica e Diretrizes Operacionais

- **Framework**: Next.js 16 (App Router) + React 19.
- **Estilização**: Tailwind CSS v4 (Design System *Warm Minimalism*).
- **Banco de Dados**: PostgreSQL com Prisma ORM (`@prisma/client`).
- **Autenticação e Autorização**: NextAuth v5 com verificação RBAC (`Role.ADMIN` vs `Role.PARTICIPANT`).
- **Validação de Dados**: Zod para todas as Server Actions e formulários.
- **Precisão Financeira**: Valores monetários em `Decimal(12,2)` no banco e aritmética à prova de dízimas periódicas de rateio.
- **Saúde do Repositório**: Toda modificação deve manter `npx tsc --noEmit` executando com código `0`.
```

---

### 4.3 Mapeamento dos Arquivos de Descoberta (M1 & M2)
Arquivos a serem gerados e gerenciados:
- `.agents/rules/governance-workflow.md` (Governança detalhada)
- `AGENTS.md` (Workspace root atualizado, preservando linhas 1 a 9)
- `.agents/agents/ciso-security-lead/agent.md` & `.agents/agents/ciso-security-lead.md`
- `.agents/agents/tech-lead-architect/agent.md` & `.agents/agents/tech-lead-architect.md`
- `.agents/agents/senior-backend-eng/agent.md` & `.agents/agents/senior-backend-eng.md`
- `.agents/agents/senior-frontend-eng/agent.md` & `.agents/agents/senior-frontend-eng.md`
- `.agents/agents/senior-qa-sdet/agent.md` & `.agents/agents/senior-qa-sdet.md`

---

## 5. Verification Method

Para verificar independentemente a arquitetura e as regras levantadas:

1. **Verificação de Compilação e Integridade da Stack**:
   ```powershell
   npx tsc --noEmit
   ```
   *Critério de Sucesso*: Exit code 0, nenhuma mensagem de erro no stderr.

2. **Verificação de Preservação do Bloco Next.js**:
   Inspecionar as linhas 1 a 10 de `AGENTS.md` e confirmar que o conteúdo entre `<!-- BEGIN:nextjs-agent-rules -->` e `<!-- END:nextjs-agent-rules -->` permanece idêntico ao original.

3. **Verificação dos Arquivos de Descoberta e Regras**:
   Após a execução dos Workers nos milestones M1 e M2, verificar a existência física dos 10 arquivos de agentes e do arquivo de governança:
   - Os 5 pares de arquivos de agente (total de 10 arquivos em `.agents/agents/`).
   - O arquivo `.agents/rules/governance-workflow.md`.

4. **Verificação dos Tokens no Pipeline**:
   Validar que os relatórios e logs de transição contenham os tokens formais exigidos: `APPROVED_BY_QA`, `APPROVED_BY_TECH_LEAD`, e `APPROVED_BY_SECURITY`.

5. **Condições de Invalidação**:
   - Edição ou exclusão do bloco `nextjs-agent-rules` em `AGENTS.md`.
   - Tentativa de usar symlinks no Windows que falhe por falta de permissão em vez de arquivos duplicados/espelhados.
   - Qualquer tentativa de sobrepor o veto `REJECTED_BY_SECURITY` emitido pelo `ciso-security-lead`.
