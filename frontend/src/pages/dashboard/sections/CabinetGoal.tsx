// Overview, Cabinet view: Cabinet Points toward the 20 a Graduating Cabinet
// Member needs. A target, not a cap: past 20 the number keeps counting and
// the bar stays full.
function CabinetGoal({ points, goal }: { points: number; goal: number }) {
    const reached = points >= goal;
    return (
        <div className="ov-cabinet">
            <div className="ov-cabinet__top">
                <span>Cabinet Points</span>
                <strong>{points} of {goal}</strong>
            </div>
            <div className="ov-cabinet__track" role="progressbar" aria-valuemin={0} aria-valuemax={goal}
                aria-valuenow={Math.min(points, goal)} aria-valuetext={`${points} of ${goal} Cabinet Points`} aria-label="Cabinet Points">
                <div className="ov-cabinet__fill" style={{ width: `${Math.min(100, (points / goal) * 100)}%` }} />
            </div>
            <p className={`ov-cabinet__note${reached ? ' is-reached' : ''}`}>
                {reached ? `You reached ${goal}, enough to graduate.` : `${goal - points} more to graduate.`}
            </p>
        </div>
    );
}

export default CabinetGoal;
