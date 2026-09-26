import { useRef, useState } from 'react';
import { getLocalTimeZone, parseDate, today, type CalendarDate } from '@internationalized/date';
import {
    Button, Calendar, CalendarCell, CalendarGrid, DatePicker as AriaDatePicker, DateInput, DateSegment,
    Dialog, Group, Heading, Label, Popover,
} from 'react-aria-components';

type DatePickerProps = {
    label: string;
    // Keep the label for screen readers only (the quick-add row has no room).
    hideLabel?: boolean;
    // 'YYYY-MM-DD', or '' for no date.
    value: string;
    onChange: (iso: string) => void;
    // Adds a Clear shortcut, for dates the code doesn't need.
    optional?: boolean;
    className?: string;
};

function toCalendarDate(iso: string): CalendarDate | null {
    if (!iso) return null;
    try { return parseDate(iso); } catch { return null; }
}

// A date field you can type into, with the site's own calendar under it.
// A click anywhere in the box opens the calendar and a click outside it (the
// box included) closes it; picking a day or a shortcut closes it too.
function DatePicker({ label, hideLabel, value, onChange, optional, className }: DatePickerProps) {
    const [open, setOpen] = useState(false);
    const press = useRef({ wasOpen: false, touch: false });
    const pick = (iso: string) => {
        onChange(iso);
        setOpen(false);
    };
    const now = today(getLocalTimeZone());
    const shortcuts = [
        { label: 'Today', iso: now.toString() },
        { label: 'Tomorrow', iso: now.add({ days: 1 }).toString() },
    ];

    return (
        <AriaDatePicker className={`date-picker${className ? ` ${className}` : ''}`}
            aria-label={hideLabel ? label : undefined}
            value={toCalendarDate(value)} onChange={(date) => onChange(date ? date.toString() : '')}
            isOpen={open} onOpenChange={setOpen}>
            {!hideLabel && <Label className="date-picker__label">{label}</Label>}
            {/* Capture, because the segments stop the click on its way up. The
                calendar button toggles the picker itself. */}
            <Group className="date-picker__field"
                onPointerDownCapture={(e) => { press.current = { wasOpen: open, touch: e.pointerType !== 'mouse' }; }}
                onClickCapture={(e) => {
                    if ((e.target as Element).closest('button')) return;
                    // React Aria already closed it on the press (an outside click).
                    if (!press.current.wasOpen) setOpen(true);
                    // Leaving on a phone: drop focus so the keyboard doesn't come up.
                    else if (press.current.touch) requestAnimationFrame(() => (document.activeElement as HTMLElement | null)?.blur());
                    press.current = { wasOpen: false, touch: false };
                }}>
                <DateInput className="date-picker__input">
                    {(segment) => <DateSegment className="date-picker__segment" segment={segment} />}
                </DateInput>
                <Button className="date-picker__button" aria-label="Open calendar">
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M3 10h18M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </Button>
            </Group>
            <Popover className="date-picker__popover" placement="bottom start" offset={6}>
                <Dialog className="date-picker__dialog">
                    <Calendar className="date-picker__calendar">
                        <header className="date-picker__header">
                            <Button slot="previous" className="date-picker__nav" aria-label="Previous month">‹</Button>
                            <Heading className="date-picker__month" />
                            <Button slot="next" className="date-picker__nav" aria-label="Next month">›</Button>
                        </header>
                        <CalendarGrid className="date-picker__grid">
                            {(date) => <CalendarCell className="date-picker__day" date={date} />}
                        </CalendarGrid>
                    </Calendar>
                    <footer className="date-picker__shortcuts">
                        {shortcuts.map((shortcut) => (
                            <Button key={shortcut.label} className="date-picker__shortcut" onPress={() => pick(shortcut.iso)}>
                                {shortcut.label}
                            </Button>
                        ))}
                        {optional && value && (
                            <Button className="date-picker__shortcut date-picker__shortcut--clear" onPress={() => pick('')}>Clear</Button>
                        )}
                    </footer>
                </Dialog>
            </Popover>
        </AriaDatePicker>
    );
}

export default DatePicker;
