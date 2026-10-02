// The view switcher ("View as" in the Account menu): E-Board and Web-team
// Testers can preview the General Member or Cabinet Member view. It only
// changes what's displayed; nothing is written to Firestore, and whatever
// they do while previewing still happens as their real account.
import type { Member } from './computeStanding';
import { isHeldToCabinetRules } from './members';

export type View = 'general' | 'cabinet';

export const VIEWS: View[] = ['general', 'cabinet'];

export const VIEW_LABELS: Record<View, string> = {
    general: 'General Member',
    cabinet: 'Cabinet Member',
};

/** Only E-Board and Web-team Testers get "View as". */
export function canSwitchView(member: Member): boolean {
    return member.eboard === true || member.webTeam === true;
}

/** The view that's really the Member's: Cabinet for E-Board (shown as
 *  exempt) and for anyone held to the Cabinet rules (a Web-team Tester),
 *  General otherwise. */
export function ownView(member: Member): View {
    return member.eboard === true || isHeldToCabinetRules(member) ? 'cabinet' : 'general';
}

/** The view to show: the picked one, if the Member may switch; else their own. */
export function effectiveView({ own, canSwitch }: { own: View; canSwitch: boolean }, picked: View | null): View {
    return picked && canSwitch ? picked : own;
}

/** The Member as the shown view sees them, for computeStanding and the
 *  explainer. `null` returns the doc unchanged. E-Board in the Cabinet view
 *  is marked `exemptView`: they see the Cabinet screens but owe nothing. */
export function withView<M extends Member>(member: M, view: View | null): M {
    if (!view) return member;
    const cabinet = view === 'cabinet';
    return {
        ...member,
        heldToCabinetRules: cabinet,
        exemptView: cabinet && member.eboard === true && !member.webTeam && !isHeldToCabinetRules(member),
    };
}
