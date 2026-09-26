import { useRef } from 'react';

type DateFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

// A native date input that, on a touch screen, lets go when tapped a second
// time: the tap closes the picker and leaves the field instead of reopening it.
// A mouse still clicks into the mm/dd/yyyy parts as usual.
function DateField(props: DateFieldProps) {
    const leaving = useRef(false);

    return (
        <input {...props} type="date"
            onPointerDown={(e) => {
                leaving.current = e.pointerType !== 'mouse' && document.activeElement === e.currentTarget;
                props.onPointerDown?.(e);
            }}
            onClick={(e) => {
                if (leaving.current) {
                    e.preventDefault();
                    e.currentTarget.blur();
                    leaving.current = false;
                }
                props.onClick?.(e);
            }} />
    );
}

export default DateField;
