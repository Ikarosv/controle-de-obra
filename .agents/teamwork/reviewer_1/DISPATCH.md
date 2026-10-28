# Dispatch for Reviewer 1

## Identity
- Role: Agent Definitions & Prompt Reviewer
- Working directory: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\reviewer_1

## Mandatory Reading
- ORIGINAL_REQUEST.md: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\orchestrator_1\PROJECT.md
- Worker 1 handoff: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\worker_1\handoff.md

## Review Scope & Instructions
1. Independently inspect all 5 canonical agent definitions in `.agents/agents/<name>/agent.md`:
   - `ciso-security-lead`
   - `tech-lead-architect`
   - `senior-backend-eng`
   - `senior-frontend-eng`
   - `senior-qa-sdet`
2. Verify YAML frontmatter validity (`name`, `description`, `role`, `tools`, `authority_level`, `hard_gate_tokens`).
3. Verify comprehensive Brazilian Portuguese Staff/Principal system prompts.
4. Verify project-specific checklists (Next.js 16, React 19, Tailwind v4 Warm Minimalism, Prisma Decimal(12,2), NextAuth v5, Zod).
5. Verify required tokens in prompt definitions (`APPROVED_BY_SECURITY`, `REJECTED_BY_SECURITY`, `APPROVED_BY_TECH_LEAD`, `CHANGES_REQUESTED_BY_TECH_LEAD`, `APPROVED_BY_QA`, `QA_BLOCKED`).
6. Run `npx tsc --noEmit` to verify typecheck integrity.
7. Issue a formal verdict (`APPROVE` or `REQUEST_CHANGES`) in `handoff.md` and message the orchestrator.


## 2026-10-26T21:37:09Z
You are Reviewer 1 (Agent Definitions & Prompt Reviewer).
Your working directory is: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\reviewer_1
Your dispatch instructions are at: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\reviewer_1\DISPATCH.md
MANDATORY: You MUST read ORIGINAL_REQUEST.md before starting work at: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\ORIGINAL_REQUEST.md

Task:
1. Read ORIGINAL_REQUEST.md, DISPATCH.md, and Worker 1's handoff (c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\worker_1\handoff.md).
2. Review all 5 canonical agent definitions in `.agents/agents/<name>/agent.md` and their flat aliases `.agents/agents/<name>.md`.
3. Check YAML frontmatters, Staff/Principal level prompts in Portuguese, domain checklists (Next.js 16, React 19, Tailwind v4, Prisma Decimal(12,2), NextAuth v5, Zod), and tokens (APPROVED_BY_SECURITY, REJECTED_BY_SECURITY, APPROVED_BY_TECH_LEAD, CHANGES_REQUESTED_BY_TECH_LEAD, APPROVED_BY_QA, QA_BLOCKED).
4. Run `npx tsc --noEmit` via run_command to verify that workspace TypeScript compilation remains clean.
5. Write your comprehensive review in `handoff.md` with explicit verdict (APPROVE or REQUEST_CHANGES) and notify your parent via send_message.
