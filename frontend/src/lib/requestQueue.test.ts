import { describe, expect, it } from 'vitest';
import { requestFilters } from './requestQueue';

describe('requestFilters', () => {
    it('narrows to the tab\'s status', () => {
        expect(requestFilters('pending', null)).toEqual([{ field: 'status', value: 'pending' }]);
        expect(requestFilters('denied', null)).toEqual([{ field: 'status', value: 'denied' }]);
    });

    it('puts no status on the All tab, so it reads every request', () => {
        expect(requestFilters('all', null)).toEqual([]);
    });

    it('adds the picked member, so one person\'s requests are filtered on the server', () => {
        expect(requestFilters('approved', 'maria@ufl.edu')).toEqual([
            { field: 'status', value: 'approved' },
            { field: 'userEmail', value: 'maria@ufl.edu' },
        ]);
    });

    it('lower-cases the member, since ?member= comes from a link', () => {
        expect(requestFilters('all', 'Maria@UFL.edu')).toEqual([{ field: 'userEmail', value: 'maria@ufl.edu' }]);
    });
});
