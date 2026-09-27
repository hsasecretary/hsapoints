// The view switcher ("View as" in the Account menu): E-Board and Web-team
// Testers can preview the General Member or Cabinet Member view. It only
// changes what's displayed; nothing is written to Firestore, and whatever
// they do while previewing still happens as their real account.
import type { Member } from './computeStanding';
import { isHeldToCabinetRules } from './members';

export type View = 'general' | 'cabinet';

export const VIEW_LABELS: Record<View, string> = {
    general: 'General Member',
    cabinet: 'Cabinet Member',
};

/** Only E-Board and Web-team Testers get "View as". */
export function canSwitchView(member: Member): boolean {
    return member.eboard === true || member.webTeam === true;
}

/** The view that's really the Member's: Cabinet when held to the Cabinet
 *  rules (so a Web-team Tester), General otherwise (so E-Board). */
export function ownView(member: Member): View {
    return isHeldToCabinetRules(member) ? 'cabinet' : 'general';
}

/** The view to show: the picked one, if the Member may switch; else their own. */
export function effectiveView(member: Member, picked: View | null): View {
    return picked && canSwitchView(member) ? picked : ownView(member);
}

/** The Member as the picked view sees them, for computeStanding and the
 *  explainer. `null` (the Own View) returns the doc unchanged. */
export function withView<M extends Member>(member: M, view: View | null): M {
    if (!view) return member;
    return { ...member, heldToCabinetRules: view === 'cabinet' };
}
