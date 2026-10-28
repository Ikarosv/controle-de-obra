# Original User Request

## 2026-10-26T21:16:04Z

Estruturar e criar a arquitetura completa de 5 subagentes de engenharia Sênior/Staff e regras de governança para o projeto **Controle de Obra** (Next.js 16 App Router, Tailwind CSS v4, Prisma/PostgreSQL, NextAuth v5 e Zod), gerando os arquivos de definição em `.agents/agents/<nome-do-agente>/agent.md` (e equivalentes de descoberta `.agents/agents/<nome-do-agente>.md` e `.agents/rules/governance-workflow.md`).

Working directory: c:\Users\ikaro\Workspace\Controle De Obra
Integrity mode: development

## Requirements

### R1. Criação dos 5 Perfis de Agentes (`.agents/agents/<nome-do-agente>/agent.md`)
Criar a estrutura de diretórios e os arquivos de configuração detalhados para os 5 subagentes solicitados, com System Prompts em português de nível Staff/Principal, contendo frontmatter YAML estruturado (nome, descrição, papel, ferramentas habilitadas como `filesystem`, `code_execution`, etc.), diretrizes técnicas específicas para a stack do projeto (Next.js 16, Server Actions, Prisma, Zod, Tailwind v4) e protocolos formais de comunicação e handoff:
1. **`ciso-security-lead` (Líder de Segurança da Informação / Staff AppSec Engineer)**: Especialista em cibersegurança, OWASP Top 10, DevSecOps, RBAC/NextAuth v5, proteção contra SQLi/XSS/Command Injection/CSRF, proteção de secrets e auditoria de dependências. Possui **poder de veto absoluto (Hard Gate)** e é o único autorizado a emitir o selo `APPROVED_BY_SECURITY` ou reprovar com `REJECTED_BY_SECURITY` + relatório técnico acionável.
2. **`tech-lead-architect` (Tech Lead & Principal Software Architect)**: Responsável por decompor demandas em tarefas atômicas, garantir Clean Architecture, DDD, separação Server/Client Components, performance e manutenibilidade. Realiza o Code Review arquitetural antes do envio à segurança, emitindo `APPROVED_BY_TECH_LEAD` ou `CHANGES_REQUESTED_BY_TECH_LEAD`.
3. **`senior-backend-eng` (Staff Backend & Database Engineer)**: Especialista em Server Actions, Prisma ORM, PostgreSQL (`Decimal(12,2)` para precisão financeira), transações atômicas, validação estrita com Zod e resiliência. Deve obrigatoriamente acionar QA, Tech Lead e CISO antes de encerrar qualquer entrega.
4. **`senior-frontend-eng` (Senior Frontend & UI/UX Engineer)**: Especialista em React 19, Next.js 16 App Router, Tailwind v4 (estética *Warm Minimalism*), `react-hook-form`, acessibilidade WCAG AA e sanitização client-side. Submete todas as entregas ao fluxo de revisão de QA, Arquitetura e Segurança.
5. **`senior-qa-sdet` (Senior QA & Automation Engineer)**: Especialista em pirâmide de testes, testes unitários, de integração e E2E, tentando quebrar proativamente as implementações com edge cases financeiros (dízimas de rateio, centavos faltantes, payloads malformados, bypass de role `ADMIN`/`PARTICIPANT` e condições de corrida). Bloqueia o avanço caso qualquer teste falhe (`QA_BLOCKED`) ou aprova com `APPROVED_BY_QA`.

### R2. Governança e Workflow Obrigatório de Engenharia (Hard Gate)
Configurar de forma explícita tanto no prompt do `tech-lead-architect` quanto em uma regra global do workspace (`.agents/rules/governance-workflow.md` e `AGENTS.md`) o pipeline obrigatório para qualquer nova feature, refatoração ou correção:
**`1. Planejamento (tech-lead-architect) -> 2. Implementação (senior-backend-eng / senior-frontend-eng) + Testes Automatizados (senior-qa-sdet) -> 3. Revisão Arquitetural (tech-lead-architect: APPROVED_BY_TECH_LEAD) -> 4. Auditoria e Aprovação Final de Segurança com Poder de Veto (ciso-security-lead: APPROVED_BY_SECURITY)`**.
Nenhuma tarefa pode ser considerada pronta sem os três selos formais (`APPROVED_BY_QA`, `APPROVED_BY_TECH_LEAD` e `APPROVED_BY_SECURITY`).

## Acceptance Criteria

### Estrutura de Arquivos e Descoberta
- [ ] Os 5 arquivos principais existem nos caminhos exatos solicitados:
  - `.agents/agents/ciso-security-lead/agent.md`
  - `.agents/agents/tech-lead-architect/agent.md`
  - `.agents/agents/senior-backend-eng/agent.md`
  - `.agents/agents/senior-frontend-eng/agent.md`
  - `.agents/agents/senior-qa-sdet/agent.md`
- [ ] Existe a regra de governança do time em `.agents/rules/governance-workflow.md` documentando o protocolo de orquestração e os portões de qualidade.

### Conteúdo Técnico e Governança nos System Prompts
- [ ] Cada arquivo `agent.md` possui frontmatter YAML válido (`name`, `description`, `role`, `tools`) e um System Prompt completo de nível Sênior/Staff, com checklists operacionais contextualizados para o sistema **Controle de Obra**, formatos padronizados de parecer/relatório e regras claras de bloqueio.
- [ ] O arquivo do `ciso-security-lead` define explicitamente o poder de veto (`Hard Gate`), checklist OWASP Top 10 + Next.js Server Actions + RBAC (`ADMIN` vs `PARTICIPANT`) e os tokens de status `APPROVED_BY_SECURITY` e `REJECTED_BY_SECURITY`.
- [ ] O arquivo do `tech-lead-architect` define explicitamente o fluxo sequencial obrigatório (**Planejamento -> Implementação + Testes (QA) -> Revisão do Tech Lead -> Auditoria e Aprovação Final do Líder de Segurança (`ciso-security-lead`)**) e os tokens `APPROVED_BY_TECH_LEAD` e `CHANGES_REQUESTED_BY_TECH_LEAD`.
- [ ] Os arquivos de `senior-backend-eng`, `senior-frontend-eng` e `senior-qa-sdet` contêm a regra mandatória de submeter toda entrega ao ciclo de revisão dos líderes e bloquear qualquer avanço caso testes quebrem no terminal.
- [ ] O projeto existente continua íntegro (`npx tsc --noEmit` executa com código de saída `0`).
