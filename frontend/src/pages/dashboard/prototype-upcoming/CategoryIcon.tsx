import type { Category } from './events';

// PROTOTYPE (throwaway). Outline icons drawn to match the navbar's (24px grid, 1.8
// stroke, round caps) so the section looks like it belongs to the site, not an icon pack.
const paths: Record<Category, JSX.Element> = {
    gbm: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
    hlhm: <><path d="M6 21V4" /><path d="M6 5h12l-3 3.5 3 3.5H6" /></>,
    mlp: <><path d="M12 21v-9" /><path d="M12 12c0-3.5 2.5-6 7-6 0 3.5-2.5 6-7 6z" /><path d="M12 16c0-2.6-1.8-4.5-6-4.5 0 2.6 1.8 4.5 6 4.5z" /></>,
    opa: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8.5 12.5l2.5 2.5 4.5-5.5" /></>,
    fundraiser: <><circle cx="12" cy="12" r="8.5" /><path d="M14.7 9.4c-.5-.9-1.5-1.4-2.7-1.4-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.2-.5-2.7-1.4M12 6.5V8M12 16v1.5" /></>,
    service: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
    social: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />,
    cabinet: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></>,
    tabling: <path d="M3 9h18M5 9v11M19 9v11M3 9l2-4h14l2 4" />,
    other: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
};

export default function CategoryIcon({ cat, size = 14 }: { cat: Category; size?: number }) {
    return (
        <svg className="up-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {paths[cat]}
        </svg>
    );
}
