// A segmented control: one row of options, one picked. The Points page uses it
// for Requests · Leaderboard. Styles live in .segments (styles/base.css).
function Segments<K extends string>({ options, value, onChange, label }: {
    options: [K, string][];
    value: K;
    onChange: (key: K) => void;
    /** What the row picks between, for screen readers. */
    label: string;
}) {
    return (
        <div className="segments" role="tablist" aria-label={label}>
            {options.map(([key, text]) => (
                <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={value === key}
                    className={`segments__option${value === key ? ' is-on' : ''}`}
                    onClick={() => onChange(key)}
                >
                    {text}
                </button>
            ))}
        </div>
    );
}

export default Segments;
