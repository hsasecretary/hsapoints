type Choice = { value: string; label: string };

type ChoiceGroupProps = {
    /** Radio group name, and the prefix for each option's id (`${name}-${value}`). */
    name: string;
    options: Choice[];
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    /** id of the visible label, for screen readers. */
    labelledBy?: string;
};

// A row of buttons where exactly one is selected (e.g. Fall / Spring).
// Real radio inputs underneath, so keyboard use and `required` still work;
// styled by .choice-group in styles/base.css.
function ChoiceGroup({ name, options, value, onChange, required, labelledBy }: ChoiceGroupProps) {
    return (
        <div className="choice-group" role="radiogroup" aria-labelledby={labelledBy}>
            {options.map((option) => (
                <label
                    key={option.value}
                    className={`choice-group__option${value === option.value ? ' is-selected' : ''}`}
                >
                    <input
                        type="radio"
                        id={`${name}-${option.value}`}
                        name={name}
                        value={option.value}
                        checked={value === option.value}
                        onChange={() => onChange(option.value)}
                        required={required}
                    />
                    {option.label}
                </label>
            ))}
        </div>
    );
}

export default ChoiceGroup;
