// Helpers for reading a member's role from their users/{email} document.
import { eboardPositions, formatAccountType } from './roles';

type MemberDoc = {
    involvement?: string;
    cabinet?: string;
    eboard?: boolean;
};

/** "General member" or "MLP general member" — no cabinet or e-board role.
 *  Uses the involvement chosen at sign-up; older accounts without that field
 *  count as general when they have no cabinet and aren't on e-board. */
export function isGeneralMember(member: MemberDoc): boolean {
    if (member.involvement) {
        return member.involvement === 'general' || member.involvement === 'mlp';
    }
    return (member.cabinet ?? 'none') === 'none' && !member.eboard;
}

/** Held to the Cabinet Member rules (Core Events, Semester Requirements,
 *  Strikes, Cabinet-only Event Types): Cabinet Members and Web-team Testers.
 *  E-Board sets `heldToCabinetRules`; until the migration (#77) backfills it,
 *  fall back to the rule the migration uses: a Web-team Tester, or approved
 *  onto a cabinet and not on E-Board. */
export function isHeldToCabinetRules(
    member: MemberDoc & { approved?: boolean; heldToCabinetRules?: boolean; webTeam?: boolean },
): boolean {
    if (typeof member.heldToCabinetRules === 'boolean') return member.heldToCabinetRules;
    if (member.webTeam === true) return true;
    return (member.cabinet ?? 'none') !== 'none' && member.approved === true && !member.eboard;
}

/** The role E-Board sees next to a name in a member search. A web-team
 *  member on E-Board is a tester first: they follow the rubric. */
export function roleLine(
    member: MemberDoc & { approved?: boolean; heldToCabinetRules?: boolean; webTeam?: boolean; position?: string },
): string {
    const eboard = member.eboard
        ? `E-Board, ${eboardPositions.find((p) => p.value === member.position)?.label ?? 'member'}`
        : '';
    if (member.webTeam) return eboard ? `Web-team Tester (${eboard})` : 'Web-team Tester';
    if (eboard) return eboard;
    if (isHeldToCabinetRules(member)) return `${formatAccountType(member.cabinet)} cabinet`;
    return member.involvement === 'mlp' ? 'MLP General Member' : 'General Member';
}
