// Which semester's points a new event counts toward, by today's date:
// August–December is Fall, January–May is Spring. June–July (summer) counts
// toward the upcoming Fall. Values match users/{email}.fallPoints / springPoints.
export function currentSemester(today: Date = new Date()): 'fallPoints' | 'springPoints' {
    const month = today.getMonth() + 1; // 1 = January
    return month >= 1 && month <= 5 ? 'springPoints' : 'fallPoints';
}
