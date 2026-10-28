# Dispatch for Worker 1

## Identity
- Role: Implementation Worker
- Working directory: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\worker_1

## Mandatory Documents to Read
1. ORIGINAL_REQUEST.md: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\ORIGINAL_REQUEST.md
2. PROJECT.md: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\orchestrator_1\PROJECT.md
3. Explorer 1 Handoff: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\explorer_survey_1\handoff.md
4. Explorer 2 Handoff: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\explorer_survey_2\handoff.md
5. Explorer 3 Handoff: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\explorer_survey_3\handoff.md

## Exclusive Write Ownership
You exclusively own and will create/modify:
- `.agents/agents/ciso-security-lead/agent.md` & `.agents/agents/ciso-security-lead.md`
- `.agents/agents/tech-lead-architect/agent.md` & `.agents/agents/tech-lead-architect.md`
- `.agents/agents/senior-backend-eng/agent.md` & `.agents/agents/senior-backend-eng.md`
- `.agents/agents/senior-frontend-eng/agent.md` & `.agents/agents/senior-frontend-eng.md`
- `.agents/agents/senior-qa-sdet/agent.md` & `.agents/agents/senior-qa-sdet.md`
- `.agents/rules/governance-workflow.md`
- `AGENTS.md` (root — preserve the `<!-- BEGIN:nextjs-agent-rules -->` block verbatim)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Implementation Requirements
1. **5 Subagent Canonical Definitions & Discovery Aliases**:
   - Create directories `.agents/agents/<nome-do-agente>/` and files `agent.md`.
   - Create flat alias files `.agents/agents/<nome-do-agente>.md` with identical mirrored content for cross-tool discovery.
   - Include valid YAML frontmatter (`name`, `description`, `role`, `tools`, `authority_level`, `hard_gate_tokens`).
   - Write comprehensive, Staff/Principal-level Portuguese system prompts:
     - `ciso-security-lead`: Absolute veto power, OWASP Top 10, NextAuth v5, Server Actions security, RBAC (`ADMIN` vs `PARTICIPANT`), tokens `APPROVED_BY_SECURITY` and `REJECTED_BY_SECURITY`.
     - `tech-lead-architect`: Clean Arch, DDD, Server vs Client components, architectural code review, tokens `APPROVED_BY_TECH_LEAD` and `CHANGES_REQUESTED_BY_TECH_LEAD`.
     - `senior-backend-eng`: Server Actions, Prisma ORM, PostgreSQL `Decimal(12,2)`, atomic `$transaction`, strict Zod, mandatory handoff to QA, Tech Lead, CISO.
     - `senior-frontend-eng`: React 19, Next.js 16 App Router, Tailwind v4 (*Warm Minimalism* aesthetic), `react-hook-form`, WCAG AA accessibility, handoff to QA, Tech Lead, CISO.
     - `senior-qa-sdet`: Test pyramid, financial edge cases (dízimas de rateio, missing cents, negative values, role bypass `ADMIN` vs `PARTICIPANT`, race conditions), tokens `APPROVED_BY_QA` and `QA_BLOCKED`.
2. **Governance Workflow Rule (`.agents/rules/governance-workflow.md`)**:
   - Document the mandatory 4-stage sequential pipeline:
     `1. Planejamento (tech-lead-architect) -> 2. Implementação + Testes (senior-backend-eng/senior-frontend-eng + senior-qa-sdet) -> 3. Revisão Arquitetural (tech-lead-architect) -> 4. Auditoria de Segurança com Poder de Veto (ciso-security-lead)`.
   - Document the RACI matrix, hard gates, formal token table, financial precision rules, and the 3-seal Definition of Done.
3. **Workspace Rules in `AGENTS.md`**:
   - Preserve lines 1-9 containing the `<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->` block verbatim.
   - Append the multi-agent architecture overview, the 4-stage pipeline, the 3-seal DoD, and stack rules.
4. **Verification**:
   - Run `npx tsc --noEmit` and verify exit code 0.
   - Verify all 10 agent files exist, `.agents/rules/governance-workflow.md` exists, and `AGENTS.md` is updated.
   - Write comprehensive `handoff.md` in `c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\worker_1\handoff.md`.
   - Send completion message to orchestrator.


## 2026-10-26T21:27:15Z
You are Worker 1 (Implementation Worker).
Your working directory is: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\worker_1
Your dispatch instructions are at: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\worker_1\DISPATCH.md
MANDATORY: You MUST read ORIGINAL_REQUEST.md before starting work at: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context and Input References:
- PROJECT.md: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\orchestrator_1\PROJECT.md
- Explorer 1 (Stack & Codebase) handoff: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\explorer_survey_1\handoff.md
- Explorer 2 (Subagent Profiles Spec) handoff: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\explorer_survey_2\handoff.md
- Explorer 3 (Governance & Discovery) handoff: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\explorer_survey_3\handoff.md

Your Exclusive Write Ownership:
1. `.agents/agents/ciso-security-lead/agent.md` & `.agents/agents/ciso-security-lead.md`
2. `.agents/agents/tech-lead-architect/agent.md` & `.agents/agents/tech-lead-architect.md`
3. `.agents/agents/senior-backend-eng/agent.md` & `.agents/agents/senior-backend-eng.md`
4. `.agents/agents/senior-frontend-eng/agent.md` & `.agents/agents/senior-frontend-eng.md`
5. `.agents/agents/senior-qa-sdet/agent.md` & `.agents/agents/senior-qa-sdet.md`
6. `.agents/rules/governance-workflow.md`
7. `AGENTS.md` (root — preserve the existing `<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->` block lines 1-9 verbatim, appending the governance and multi-agent architecture sections)
