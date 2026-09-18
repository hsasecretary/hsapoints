// Helpers for reading a member's role from their users/{email} document.

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
