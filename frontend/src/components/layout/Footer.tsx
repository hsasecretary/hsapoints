import { Link } from 'react-router-dom';

const UFHSA_URL = 'https://www.ufhsa.com';
const INSTAGRAM_URL = 'https://www.instagram.com/hsa.uf/';
const LINKEDIN_URL = 'https://www.linkedin.com/company/hsauf/';
const CALENDAR_URL =
    'https://calendar.google.com/calendar/embed?src=ae59c0f6702553b609b32a2d3590df6a527b45a92069bbf28f9983f89aaab437%40group.calendar.google.com&ctz=America%2FNew_York';
const CONTACT_EMAIL = 'hsapresidentuf@gmail.com';
// Student Government seal, currently served from ufhsa.com (Wix).
const SG_LOGO_URL =
    'https://static.wixstatic.com/media/fd581a_bfe406e2559a4721a4744604f5d83fd7~mv2_d_1912_1894_s_2.png/v1/fill/w_106,h_104,al_c,q_85,enc_auto/fd581a_bfe406e2559a4721a4744604f5d83fd7~mv2_d_1912_1894_s_2.png';

function InstagramIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
    );
}

function LinkedInIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.86 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
        </svg>
    );
}

function GlobeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
        </svg>
    );
}

function MailIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
            <path d="M3 6.5l9 6 9-6" strokeLinecap="round" />
        </svg>
    );
}

const SOCIALS = [
    { href: INSTAGRAM_URL, label: 'UF HSA on Instagram', Icon: InstagramIcon },
    { href: LINKEDIN_URL, label: 'UF HSA on LinkedIn', Icon: LinkedInIcon },
    { href: UFHSA_URL, label: 'UF HSA website', Icon: GlobeIcon },
    { href: `mailto:${CONTACT_EMAIL}`, label: 'Email UF HSA', Icon: MailIcon, internal: true },
];

type FooterProps = {
    signedIn: boolean;
    eboard: boolean;
};

// Site-wide footer. Portal links match the SiteHeader: E-Board only shows
// for e-board members (Cabinet is reached from the E-Board page).
function Footer({ signedIn, eboard }: FooterProps) {
    const portalLinks: [string, string][] = signedIn
        ? [
            ['Dashboard', '/dashboard'],
            ...(eboard ? [['E-Board', '/eboard'] as [string, string]] : []),
        ]
        : [
            ['Log In', '/login'],
            ['Create an Account', '/signup'],
            ['Forgot Password', '/forgotPassword'],
        ];

    return (
        <footer className="site-footer">
            <div className="site-footer__inner">
                <div className="site-footer__grid">
                    <div className="site-footer__brand">
                        <p className="site-footer__name">Hispanic-Latine Student Association</p>
                        <p className="site-footer__tagline">
                            Member portal for attendance, points and events at the University of Florida.
                        </p>

                        <address className="site-footer__contact">
                            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                            <span>3100 Reitz Union</span>
                            <span>PO Box 118505</span>
                            <span>Gainesville, FL 32611-8505</span>
                        </address>

                        <div className="site-footer__socials">
                            {SOCIALS.map(({ href, label, Icon, internal }) => (
                                <a
                                    key={label}
                                    href={href}
                                    aria-label={label}
                                    title={label}
                                    {...(internal ? {} : { target: '_blank', rel: 'noreferrer noopener' })}
                                >
                                    <Icon />
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="site-footer__heading">Portal</p>
                        <ul className="site-footer__links">
                            {portalLinks.map(([label, to]) => (
                                <li key={to}>
                                    <Link to={to}>{label}</Link>
                                </li>
                            ))}
                            <li>
                                <a href={CALENDAR_URL} target="_blank" rel="noreferrer noopener">Calendar</a>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <p className="site-footer__heading">UF HSA</p>
                        <ul className="site-footer__links">
                            <li><a href={UFHSA_URL} target="_blank" rel="noreferrer noopener">UFHSA.com</a></li>
                            <li><a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener">Instagram</a></li>
                            <li><a href={LINKEDIN_URL} target="_blank" rel="noreferrer noopener">LinkedIn</a></li>
                            <li><a href={`mailto:${CONTACT_EMAIL}`}>Contact Us</a></li>
                        </ul>
                    </div>
                </div>

                <div className="site-footer__bottom">
                    <div className="site-footer__credit">
                        <img src={SG_LOGO_URL} alt="UF Student Government" width="36" height="36" />
                        <p>
                            Developed by Secretary Team<br />
                            Funded by Student Government.
                        </p>
                    </div>
                    <p className="site-footer__copyright">
                        © {new Date().getFullYear()} Hispanic-Latine Student Association at UF
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
