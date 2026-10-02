// The main nav's pages, in one fixed order for everyone (WCAG 3.2.3):
// Dashboard · Requirements (Cabinet Member view) · Requests. The desktop links
// and the phone tab bar both render this list. E-Board isn't a page here:
// SiteHeader adds E-Board ▾ to the desktop bar and puts the tools in the
// Account menu on phones, keeping the tab bar short.

export type NavIcon = 'dashboard' | 'requirements' | 'requests';

export type NavItem = {
    label: string;
    to: string;
    icon: NavIcon;
};

export function navItems({ cabinetView }: { cabinetView: boolean }): NavItem[] {
    return [
        { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
        ...(cabinetView ? [{ label: 'Requirements', to: '/requirements', icon: 'requirements' as const }] : []),
        { label: 'Requests', to: '/requests', icon: 'requests' },
    ];
}
