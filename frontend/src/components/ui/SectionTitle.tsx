import type { ReactNode } from 'react';

type SectionTitleProps = {
    children: ReactNode;
    /** Heading level for screen readers; the look is the same either way. */
    as?: 'h2' | 'h3';
    align?: 'center' | 'left';
};

// The one title style for /dashboard sections: same font, size and colour
// everywhere. Styles live in .section-title (styles/base.css).
function SectionTitle({ children, as: Tag = 'h2', align = 'center' }: SectionTitleProps) {
    return <Tag className={`section-title section-title--${align}`}>{children}</Tag>;
}

export default SectionTitle;
