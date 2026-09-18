import type { ReactNode } from 'react';

type SectionTitleProps = {
    children: ReactNode;
    /** Heading level for screen readers; the look is the same either way. */
    as?: 'h2' | 'h3';
    align?: 'center' | 'left';
    /** 'page' is the larger title at the top of a page (e.g. "Dashboard"). */
    size?: 'section' | 'page';
};

// The one title style for /dashboard sections: same font, size and colour
// everywhere. Styles live in .section-title (styles/base.css).
function SectionTitle({ children, as: Tag = 'h2', align = 'center', size = 'section' }: SectionTitleProps) {
    const sizeClass = size === 'page' ? ' section-title--page' : '';
    return <Tag className={`section-title section-title--${align}${sizeClass}`}>{children}</Tag>;
}

export default SectionTitle;
