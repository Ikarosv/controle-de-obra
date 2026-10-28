# Project: Controle de Obra — Subagents Architecture & Governance

## Architecture
- **Framework & Runtime**: Next.js 16 App Router, React 19, TypeScript strict mode.
- **Data & Persistence**: PostgreSQL with Prisma ORM 6.5 (`Decimal(12,2)` precision), fallback local store (`.data/controle-obra-db.json`).
- **Security & RBAC**: NextAuth v5 (Auth.js beta), bcryptjs, role enforcement (`ADMIN` vs `PARTICIPANT`).
- **Design & Forms**: Tailwind CSS v4 (*Warm Minimalism* tokens: terracotta `#C26D53`, sage `#4D6B53`, canvas `#FAF8F5`), `react-hook-form`, Zod.
- **Agent Governance Pipeline**: 4-stage sequential workflow:
  `1. Planejamento (tech-lead-architect) -> 2. Implementação (senior-backend-eng / senior-frontend-eng) + Testes (senior-qa-sdet) -> 3. Revisão Arquitetural (tech-lead-architect) -> 4. Auditoria de Segurança com Veto (ciso-security-lead)`
- **Discovery Strategy**: Canonical nested paths (`.agents/agents/<name>/agent.md`) + Flat discovery aliases (`.agents/agents/<name>.md`).

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | `ciso-security-lead` Profile | Staff AppSec / CISO prompt, YAML frontmatter, absolute veto power, tokens `APPROVED_BY_SECURITY` / `REJECTED_BY_SECURITY`, OWASP Top 10 + Server Actions checklist | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 2 | `tech-lead-architect` Profile | Principal Architect prompt, YAML frontmatter, Clean Arch, DDD, Server/Client components, tokens `APPROVED_BY_TECH_LEAD` / `CHANGES_REQUESTED_BY_TECH_LEAD` | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 3 | `senior-backend-eng` Profile | Staff Backend prompt, YAML frontmatter, Server Actions, Prisma `Decimal(12,2)`, atomic `$transaction`, Zod, mandatory handoff to QA/Tech Lead/CISO | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 4 | `senior-frontend-eng` Profile | Senior Frontend prompt, YAML frontmatter, React 19, Tailwind v4 Warm Minimalism, `react-hook-form`, WCAG AA, handoff to QA/Tech Lead/CISO | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 5 | `senior-qa-sdet` Profile | Senior SDET prompt, YAML frontmatter, test pyramid, financial edge cases (rateio, dízimas, centavos, bypass RBAC), tokens `APPROVED_BY_QA` / `QA_BLOCKED` | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 6 | Discovery Aliases (`<name>.md`) | 5 flat discovery alias files in `.agents/agents/<name>.md` matching canonical definitions | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 7 | Governance Workflow Rule | Global governance specification in `.agents/rules/governance-workflow.md` documenting the 4-stage pipeline, RACI, and 3-seal DoD | M1 | ORIGINAL_REQUEST §R2 | DONE |
| 8 | Workspace Rules in `AGENTS.md` | Integration of governance workflow in root `AGENTS.md` while preserving verbatim the `<!-- BEGIN:nextjs-agent-rules -->` block | M1 | ORIGINAL_REQUEST §R2 | DONE |
| 9 | Typecheck Integrity Verification | Validation that `npx tsc --noEmit` exits with code `0` and existing code integrity is intact | M2 | ORIGINAL_REQUEST §Acceptance | DONE |
| 10 | Formal Quality Gate Audit | Independent verification of all tokens, yaml frontmatters, checklists, and acceptance criteria | M2 | ORIGINAL_REQUEST §Acceptance | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status | Output |
|---|------|-------|-------------|--------|--------|
| M1 | Core Agents, Governance & Workspace Rules | 5 Canonical definitions (`.agents/agents/<name>/agent.md`) + 5 flat aliases (`.agents/agents/<name>.md`) + `.agents/rules/governance-workflow.md` + root `AGENTS.md` (preserving Next.js block) | Survey | DONE | 12 files created/updated, tsc exit 0 |
| M2 | Quality Gate & Integrity Verification | Comprehensive dual Reviewer, dual Challenger, and Forensic Auditor evaluation, plus `npx tsc --noEmit` exit 0 | M1 | DONE | Gate Result: PASS (unanimous APPROVE + CLEAN) |

## Interface Contracts
### Agent Definition Interface Contract
- **Format**: Markdown with YAML frontmatter.
- **Required YAML Frontmatter Keys**:
  - `name`: string (e.g., `ciso-security-lead`)
  - `description`: string (senior/staff role summary)
  - `role`: string (formal professional title)
  - `tools`: list of strings (`filesystem`, `code_execution`, `read_file`, `write_file`, etc.)
  - `authority_level`: string (`supreme_veto`, `architectural_lead`, `implementation_specialist`, `quality_gatekeeper`)
  - `hard_gate_tokens` (where applicable): approve/reject tokens
- **System Prompt Sections**:
  1. Identidade e Autoridade (Identity & Authority)
  2. Missão no Projeto Controle de Obra (Mission)
  3. Escopo e Ferramentas Autorizadas (Scope & Tools)
  4. Checklist Técnico Obrigatório (Domain Checklist)
  5. Tokens de Validação e Critérios de Bloqueio (Validation Tokens & Triggers)
  6. Protocolo de Comunicação e Handoff (Workflow & Handoffs)
  7. Modelo Padronizado de Parecer / Relatório (Structured Report Templates)

### Governance Pipeline Interface Contract
- **Flow**:
  1. `tech-lead-architect` produces Architecture Plan.
  2. `senior-backend-eng` / `senior-frontend-eng` implement; `senior-qa-sdet` tests.
     - SDET must issue `APPROVED_BY_QA` or block with `QA_BLOCKED`.
  3. `tech-lead-architect` reviews code.
     - Must issue `APPROVED_BY_TECH_LEAD` or request changes with `CHANGES_REQUESTED_BY_TECH_LEAD`.
  4. `ciso-security-lead` audits security.
     - Holds supreme veto: issues `APPROVED_BY_SECURITY` or blocks with `REJECTED_BY_SECURITY`.
- **Definition of Done (DoD)**:
  Requires all 3 tokens: `APPROVED_BY_QA` + `APPROVED_BY_TECH_LEAD` + `APPROVED_BY_SECURITY` + `npx tsc --noEmit` (exit code 0).

## Code Layout
- `.agents/agents/ciso-security-lead/agent.md`
- `.agents/agents/ciso-security-lead.md`
- `.agents/agents/tech-lead-architect/agent.md`
- `.agents/agents/tech-lead-architect.md`
- `.agents/agents/senior-backend-eng/agent.md`
- `.agents/agents/senior-backend-eng.md`
- `.agents/agents/senior-frontend-eng/agent.md`
- `.agents/agents/senior-frontend-eng.md`
- `.agents/agents/senior-qa-sdet/agent.md`
- `.agents/agents/senior-qa-sdet.md`
- `.agents/rules/governance-workflow.md`
- `AGENTS.md` (root, preserving Next.js block)
- `.agents/teamwork/` (orchestrator & subagent metadata ONLY)
