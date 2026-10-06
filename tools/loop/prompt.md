You are implementing one ticket in a fresh working tree. Work only on this ticket.

Ticket: #{{N}} (part of #{{PARENT}}). Its full text follows.

---
{{TICKET}}
---

Rules:
- Read `CLAUDE.md` and `CONTEXT.md` first and use the glossary terms. Respect the ADRs in `docs/adr/`.
- Build it test-first, one small red-to-green step at a time, at the seams the parent spec names (#{{PARENT}}).
- Run `npm run typecheck` and `npm test` from `frontend/` as you go. If the ticket touches `firestore.rules` or a transaction, also run `npm run test:emulator`.
- Commit your work with clear messages. End each commit message with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Do not push, open a PR, merge, switch branches, or edit issues. The loop script does those.
- If the ticket is ambiguous or blocked by something not in the tree, stop and say so in your final message instead of guessing.
- Finish with a short summary of what you built and which checks you ran.

{{FAILURE}}
