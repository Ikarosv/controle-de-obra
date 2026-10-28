# Dispatch for Explorer Survey 2

## Identity
- Role: Subagents Specification Explorer
- Working directory: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\explorer_survey_2

## Objective
Deep dive into ORIGINAL_REQUEST.md requirements for the 5 subagent profiles:
1. ciso-security-lead: OWASP Top 10, NextAuth v5 / RBAC, Server Actions security, absolute veto power, tokens: APPROVED_BY_SECURITY, REJECTED_BY_SECURITY.
2. tech-lead-architect: Clean Arch, DDD, Server/Client components, tokens: APPROVED_BY_TECH_LEAD, CHANGES_REQUESTED_BY_TECH_LEAD.
3. senior-backend-eng: Server Actions, Prisma, Decimal(12,2), Zod, mandatory QA/TechLead/CISO handoff.
4. senior-frontend-eng: React 19, Next.js 16 App Router, Tailwind v4 (Warm Minimalism), react-hook-form, WCAG AA.
5. senior-qa-sdet: Test pyramid, edge cases (rateio, cents, roles bypass, race conditions), tokens: APPROVED_BY_QA, QA_BLOCKED.
6. Detail required YAML frontmatter (name, description, role, tools) and comprehensive Portuguese system prompt contents.
7. Write your findings to `handoff.md` in your working directory and notify the orchestrator.


## 2026-10-26T21:18:37Z
Sender: 2c787fe4-ea0b-41cd-af88-77a922c6fd46
Priority: MESSAGE_PRIORITY_HIGH
Content: You are Explorer Survey 2 (Subagents Specification Explorer).
Your working directory is: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\explorer_survey_2
Your dispatch instructions are at: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\explorer_survey_2\DISPATCH.md
MANDATORY: You MUST read ORIGINAL_REQUEST.md before starting work at: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\ORIGINAL_REQUEST.md

Task:
1. Read ORIGINAL_REQUEST.md and DISPATCH.md.
2. Analyze all specifications and requirements for the 5 subagent profiles:
   - ciso-security-lead (Staff AppSec Engineer / CISO): OWASP Top 10, NextAuth v5, RBAC, Server Actions security, absolute veto power (Hard Gate), tokens: APPROVED_BY_SECURITY and REJECTED_BY_SECURITY.
   - tech-lead-architect (Principal Architect & Tech Lead): Clean Arch, DDD, Server vs Client components, tokens: APPROVED_BY_TECH_LEAD and CHANGES_REQUESTED_BY_TECH_LEAD.
   - senior-backend-eng (Staff Backend & Database Engineer): Server Actions, Prisma ORM, PostgreSQL Decimal(12,2), atomic transactions, Zod validation, handoff to QA/TechLead/CISO.
   - senior-frontend-eng (Senior Frontend & UI/UX): React 19, Next.js 16 App Router, Tailwind v4 (Warm Minimalism), react-hook-form, WCAG AA, client-side sanitization.
   - senior-qa-sdet (Senior QA & SDET): Test pyramid, financial edge cases (cents, rateio dízimas, role bypass ADMIN vs PARTICIPANT, race conditions), tokens: APPROVED_BY_QA and QA_BLOCKED.
3. Map out exact YAML frontmatter (name, description, role, tools) and comprehensive Portuguese system prompt contents, role checklists, and reporting standards.
4. Write a comprehensive report in `handoff.md` in your working directory.
5. Notify your parent (orchestrator) using send_message when complete.
