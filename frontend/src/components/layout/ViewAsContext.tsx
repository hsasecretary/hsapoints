import { createContext, useContext } from 'react';
import type { View } from '../../lib/viewAs';

// The view switcher's state, owned by App.tsx (see lib/viewAs.ts). Held in
// memory only: a reload or sign-out puts the Member back in their Own View.
export type ViewAsState = {
    /** The Member's Own View, tagged "Yours". */
    own: View;
    /** The view being shown. */
    view: View;
    /** E-Board and Web-team Testers only. */
    canSwitch: boolean;
    setView: (view: View) => void;
};

export const ViewAsContext = createContext<ViewAsState>({
    own: 'general',
    view: 'general',
    canSwitch: false,
    setView: () => {},
});

export function useViewAs(): ViewAsState {
    return useContext(ViewAsContext);
}

/** The view to apply to the displayed Member (`withView`): the previewed
 *  view, or null in the Own View. */
export function useViewOverride(): View | null {
    const { own, view } = useViewAs();
    return view === own ? null : view;
}
