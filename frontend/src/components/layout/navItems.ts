// The main nav's pages, in one fixed order for everyone (WCAG 3.2.3):
// Dashboard · Requirements (Cabinet Member view) · Requests · Guide · E-Board
// (E-Board). The desktop links and the phone tab bar both render this list.

export type NavIcon = 'dashboard' | 'requirements' | 'requests' | 'guide' | 'eboard';

export type NavItem = {
    label: string;
    to: string;
    icon: NavIcon;
    /** Has pages under `to` (E-Board's tools): active on all of them, and a
     *  dropdown of them on desktop. */
    section?: boolean;
};

export function navItems({ cabinetView, eboard }: { cabinetView: boolean; eboard: boolean }): NavItem[] {
    return [
        { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
        ...(cabinetView ? [{ label: 'Requirements', to: '/requirements', icon: 'requirements' as const }] : []),
        { label: 'Requests', to: '/requests', icon: 'requests' },
        { label: 'Guide', to: '/guide', icon: 'guide' },
        ...(eboard ? [{ label: 'E-Board', to: '/eboard', icon: 'eboard' as const, section: true }] : []),
    ];
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
    return pathname === item.to || (item.section === true && pathname.startsWith(`${item.to}/`));
}
