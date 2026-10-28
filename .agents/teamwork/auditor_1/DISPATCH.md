# Dispatch for Forensic Auditor 1

## Identity
- Role: Forensic Integrity Auditor
- Working directory: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\auditor_1

## Mandatory Reading
- ORIGINAL_REQUEST.md: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\orchestrator_1\PROJECT.md
- Worker 1 handoff: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\worker_1\handoff.md

## Forensic Integrity Audit Tasks
1. Integrity Checks:
   - Zero tolerance for cheating: verify no hardcoded fake test results, no dummy/mock facades, no empty stub files.
   - Verify all 10 agent files and governance rule are genuine, comprehensive, production-grade markdown files.
   - Verify `AGENTS.md` lines 1-9 are genuine Next.js agent rules, preserved without corruption.
2. Codebase Integrity:
   - Run `npx tsc --noEmit` and verify exit code 0 and zero compilation errors.
3. Requirements Coverage:
   - Verify all acceptance criteria from ORIGINAL_REQUEST.md are 100% satisfied.
4. Formal Verdict:
   - Issue verdict: `CLEAN` or `INTEGRITY VIOLATION` in `handoff.md` and message the orchestrator.


## 2026-10-26T21:37:09Z
You are Auditor 1 (Forensic Integrity Auditor).
Your working directory is: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\auditor_1
Your dispatch instructions are at: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\auditor_1\DISPATCH.md
MANDATORY: You MUST read ORIGINAL_REQUEST.md before starting work at: c:\Users\ikaro\Workspace\Controle De Obra\.agents\teamwork\ORIGINAL_REQUEST.md

Task:
1. Read ORIGINAL_REQUEST.md, DISPATCH.md, and Worker 1's handoff.
2. Perform forensic audit against cheating, fake/mock implementations, empty stubs, or shortcuts. Verify that all 10 agent files and governance rule are genuine, thorough, production-grade markdown definitions.
3. Verify that AGENTS.md lines 1-9 are the authentic Next.js agent rules preserved without tampering.
4. Execute `npx tsc --noEmit` via run_command and verify exit code 0.
5. Verify 100% compliance with every item in the Acceptance Criteria of ORIGINAL_REQUEST.md.
6. Issue formal audit verdict (CLEAN or INTEGRITY VIOLATION) in `handoff.md` and notify your parent via send_message.
