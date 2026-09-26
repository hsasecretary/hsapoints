// "How points work", worded in #49: version A for General and MLP Members,
// version B for Cabinet Members and E-Board. Shown in the Overview's How it
// works bubble and on the Guide page (/guide).

type ExplainerProps = {
    /** Version B: Cabinet Members and E-Board. */
    cabinet: boolean;
    /** The Member joined MLP in the spring, so their goal is 8. */
    mlpSpring?: boolean;
};

function Explainer({ cabinet, mlpSpring = false }: ExplainerProps) {
    if (cabinet) {
        return (
            <div className="explainer">
                <p className="explainer__lead">Enter the code at each event to earn points. There are three things to do:</p>
                <ol>
                    <li>
                        <strong>Tier 1 - Core Events.</strong> Come to all of them: Cabinet Thursdays, GBMs, Retreats,
                        Orientation, HLSA, and one Hispanic-Latine Heritage Month event.
                    </li>
                    <li>
                        <strong>Tier 2 - Semester Requirements.</strong> Do one of each, every semester: OPA General, OPA
                        Solidarity Session, Programming, Operations, Fundraising, Service, an Affiliate Org event (MLP
                        directors are exempt), an hour of Tabling, and the Internal Social.
                    </li>
                    <li>
                        <strong>Reach 20 Cabinet Points to graduate.</strong> Each event is worth 1 point, except Thursdays
                        and socials, which are worth 0.
                    </li>
                </ol>
                <p className="explainer__gloss">
                    Voter Eligible (VE) Points, also shown as Total Points, track your progress toward voter eligibility. You need 15.
                </p>
                <p>
                    <strong>Missed something?</strong> Any extra event (an Additional Event: more tabling hours, MLP Open, a
                    fundraiser, OPA, programming, an Affiliate Org event, CRASH) makes it up. One extra event covers the
                    oldest Missed Event and its Strike. Three Strikes means a meeting with E-Board to make a make-up plan.
                    To count as excused, file the Valid Excuse Form <em>before</em> the event.
                </p>
            </div>
        );
    }
    return (
        <div className="explainer">
            <p className="explainer__lead">Go to events, enter the event’s code, and earn points.</p>
            <p>
                <strong>Your goal: {mlpSpring ? 8 : 15} Voter Eligible (VE) Points</strong>
                {mlpSpring ? ', since you joined MLP in the spring' : ', or 8 if you joined MLP in the spring'}.
                That’s what lets you vote in E-Board elections.
            </p>
            <p className="explainer__gloss">
                Voter Eligible (VE) Points, also shown as Total Points, track your progress toward voter eligibility.
            </p>
            <p>Most events are worth 1 point. GBMs and fundraisers are worth 2. Socials don’t count.</p>
            <p>Missed the code? Submit a Point Request with a photo, and E-Board will review it.</p>
        </div>
    );
}

export default Explainer;
