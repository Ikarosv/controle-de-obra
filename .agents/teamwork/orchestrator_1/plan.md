# Orchestration Plan — Controle de Obra Subagents Architecture

## 1. Objective
Establish 5 Senior/Staff engineering subagent profiles, discovery files, governance rules, and updated AGENTS.md for the "Controle de Obra" project (Next.js 16, Tailwind CSS v4, Prisma, NextAuth v5, Zod). Validate that `npx tsc --noEmit` exits with 0 and all acceptance criteria are met.

## 2. Milestones & Phases

### Phase 0: Survey & Codebase Reconnaissance
- Spawn 3 parallel Explorers:
  - Explorer 1: Inspect existing project structure, package.json, tsconfig.json, Prisma schema, Next.js setup, NextAuth setup, and any existing `.agents` files or AGENTS.md.
  - Explorer 2: Analyze exact requirements from ORIGINAL_REQUEST.md for the 5 subagents (`ciso-security-lead`, `tech-lead-architect`, `senior-backend-eng`, `senior-frontend-eng`, `senior-qa-sdet`), specific YAML frontmatter, prompts, tokens, and role checklists.
  - Explorer 3: Investigate governance workflow, discovery files (`.agents/agents/<name>.md`, `.agents/agents/<name>/agent.md`, `.agents/rules/governance-workflow.md`), AGENTS.md structure and Next.js rule block preservation.
- Synthesize findings into `PROJECT.md`.

### Phase 1: Milestone M1 — Core Agents & Discovery Definitions
- Spawn Worker to create:
  - `.agents/agents/ciso-security-lead/agent.md` & `.agents/agents/ciso-security-lead.md`
  - `.agents/agents/tech-lead-architect/agent.md` & `.agents/agents/tech-lead-architect.md`
  - `.agents/agents/senior-backend-eng/agent.md` & `.agents/agents/senior-backend-eng.md`
  - `.agents/agents/senior-frontend-eng/agent.md` & `.agents/agents/senior-frontend-eng.md`
  - `.agents/agents/senior-qa-sdet/agent.md` & `.agents/agents/senior-qa-sdet.md`
  - Full YAML frontmatter, Staff/Principal level prompts in Portuguese, domain checklists, tokens (`APPROVED_BY_SECURITY`, `REJECTED_BY_SECURITY`, `APPROVED_BY_TECH_LEAD`, `CHANGES_REQUESTED_BY_TECH_LEAD`, `APPROVED_BY_QA`, `QA_BLOCKED`).
- Verification: 2 Reviewers, 2 Challengers, 1 Auditor.

### Phase 2: Milestone M2 — Governance Workflow & Workspace Rules
- Spawn Worker to create/update:
  - `.agents/rules/governance-workflow.md`
  - `AGENTS.md` (integrating governance workflow while strictly preserving the Next.js agent rules block)
- Verification: Run `npx tsc --noEmit` and check all rule references. 2 Reviewers, 2 Challengers, 1 Auditor.

### Phase 3: Final Verification & Synthesis
- Final audit and comprehensive verification across all acceptance criteria.
- Handoff report and communication to parent.
