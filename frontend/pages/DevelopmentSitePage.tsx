import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  FileText,
  Handshake,
  Home,
  Landmark,
  Mail,
  Map,
  MapPin,
  Menu,
  Mountain,
  PenLine,
  Phone,
  Shield,
  Star,
  Target,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { registrySeedData } from '@app/schemas';

import brookePhoto from '../assets/images/brooke-moore.jpeg';
import featuredOne from '../assets/images/real-estate-property-1.jpeg';
import featuredTwo from '../assets/images/real-estate-property-2.jpeg';
import randyPhoto from '../assets/images/randy-rimmer.png';
import stevePhoto from '../assets/images/steve-tripp.png';
import tricoLogo from '../assets/images/trico-logo.png';
import { EditableEntity } from '../components/EditableEntity.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { DevelopmentContactForm } from './DevelopmentContactForm.js';
import './development.css';

const navLinks = [
  ['Services', '#services'],
  ['Projects', '#projects'],
  ['Team', '#team'],
  ['About', '#about'],
  ['Reviews', '#reviews'],
  ['Contact', '#contact'],
] as const;
const landServices: readonly { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: 'Land Buying',
    description: 'Identify and acquire prime land opportunities across Utah.',
    icon: MapPin,
  },
  {
    title: 'Land Listing',
    description: 'Strategic marketing designed to maximize value and exposure.',
    icon: FileText,
  },
  {
    title: 'Land Development',
    description: 'Full-service expertise transforming raw land into thriving communities.',
    icon: Building2,
  },
];
const developmentServices: readonly { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: 'Land Acquisition',
    description: 'Identify and acquire prime parcels for residential and commercial development.',
    icon: MapPin,
  },
  {
    title: 'Residential Development',
    description: 'End-to-end development from site selection through construction oversight.',
    icon: Home,
  },
  {
    title: 'Commercial Development',
    description: 'Feasibility, zoning navigation, entitlement, and project management.',
    icon: Landmark,
  },
  {
    title: 'Land Development',
    description: 'Grading, utilities, roads, and site preparation for vertical construction.',
    icon: Mountain,
  },
  {
    title: 'Storage Facility Development',
    description: 'Purpose-built facilities designed for long-term investment performance.',
    icon: Building2,
  },
];
const team = [
  {
    name: 'Stephen Tripp',
    role: 'Founder & President',
    image: stevePhoto,
    bio: 'More than 40 years of experience building thriving Utah communities.',
  },
  {
    name: 'Randy Rimmer',
    role: 'Vice President',
    image: randyPhoto,
    bio: 'Development and construction expertise guiding project execution and growth.',
  },
  {
    name: 'Brooke Moore',
    role: 'Director',
    image: brookePhoto,
    bio: 'Leads development operations and strategy with a commitment to quality.',
  },
] as const;
const values = [
  {
    title: 'Vision-Driven',
    description: 'We see potential where others see raw land.',
    icon: Target,
  },
  {
    title: 'Integrity',
    description: 'Every project is built on honesty and transparency.',
    icon: Shield,
  },
  {
    title: 'Long-Term Value',
    description: 'We create lasting value for communities and investors.',
    icon: TrendingUp,
  },
] as const;
const trustStats: readonly { value: string; label: string; icon: LucideIcon }[] = [
  { value: '40+', label: 'Years Experience', icon: TrendingUp },
  { value: '1000+', label: 'Acres Transacted', icon: MapPin },
  { value: '50+', label: 'Projects Developed', icon: Building2 },
  { value: '3', label: 'States Served', icon: Compass },
];

function Boundary({
  id,
  children,
}: {
  readonly id: keyof typeof registrySeedData;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="dev-entity-slot" data-development-entity-boundary="true">
      <EditableEntity entityId={id} value={registrySeedData[id]}>
        {children}
      </EditableEntity>
    </div>
  );
}

function DevelopmentBody(): React.JSX.Element {
  const editing = useEditMode();
  const [fallback, setFallback] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('development', { signal: controller.signal })
      .then(() => setFallback(false))
      .catch(() => setFallback(true));
    return () => controller.abort();
  }, [editing.active, editing.disabledEntityIds, editing.pending]);
  return (
    <div className="dev-page">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Boundary id="development.anniversary-banner">
        <div className="dev-anniversary">
          <i />
          <strong>Celebrating 40 Years of Excellence</strong>
          <span>•</span>
          <small>1984 – 2024</small>
          <i />
        </div>
      </Boundary>
      <Boundary id="development.header">
        <header className="dev-header">
          <div className="dev-container dev-header-inner">
            <Link className="dev-brand" to="/">
              <img src={tricoLogo} alt="TriCo Development" />
              <strong>Development</strong>
            </Link>
            <nav>
              {navLinks.map(([label, href]) => (
                <a href={href} key={href}>
                  {label}
                </a>
              ))}
            </nav>
            <div className="dev-header-actions">
              <a href="tel:8015718833">
                <Phone /> (801) 571-8833
              </a>
              <a className="dev-button dev-primary" href="#contact">
                Get Started
              </a>
            </div>
            <button
              className="dev-menu-button"
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
          {menuOpen ? (
            <nav className="dev-mobile-menu">
              {navLinks.map(([label, href]) => (
                <a href={href} key={href} onClick={() => setMenuOpen(false)}>
                  {label}
                </a>
              ))}
            </nav>
          ) : null}
        </header>
      </Boundary>
      {fallback ? (
        <div className="content-notice" role="status">
          Showing the checked-in site content while published content is unavailable.
        </div>
      ) : null}
      <main id="main-content">
        <Boundary id="development.hero">
          <section className="dev-hero">
            <div className="dev-container dev-hero-inner">
              <span className="dev-pill">
                <Mountain /> Utah’s Premier Developer
              </span>
              <h1>
                Transforming Vision Into <em>Reality</em>
              </h1>
              <p>
                From raw land acquisition to finished communities, TriCo Development brings over 40
                years of experience across Utah, Idaho, and Arizona.
              </p>
              <div className="dev-actions">
                <a className="dev-button dev-primary" href="#projects">
                  View Our Projects <ArrowRight />
                </a>
                <a className="dev-button dev-outline" href="#contact">
                  Start Your Project
                </a>
              </div>
              <Boundary id="development.hero.stats">
                <div className="dev-stats">
                  <div>
                    <Map />
                    <strong>1000+</strong>
                    <span>Acres Developed</span>
                  </div>
                  <div>
                    <Building2 />
                    <strong>50+</strong>
                    <span>Projects Completed</span>
                  </div>
                  <div>
                    <Mountain />
                    <strong>3</strong>
                    <span>States Served</span>
                  </div>
                </div>
              </Boundary>
            </div>
          </section>
        </Boundary>

        <section id="services" className="dev-section dev-tint">
          <div className="dev-container">
            <Boundary id="development.land-experts.header">
              <header className="dev-heading">
                <span className="dev-pill">
                  <Mountain /> Utah Land Specialists
                </span>
                <h2>Your Land Experts</h2>
                <p>
                  Comprehensive expertise in buying, listing, and developing land across the state.
                </p>
              </header>
            </Boundary>
            <Boundary id="development.land-experts.services">
              <div className="dev-land-grid">
                {landServices.map((service) => (
                  <article className="dev-land-card" key={service.title}>
                    <service.icon />
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </article>
                ))}
              </div>
            </Boundary>
            <Boundary id="development.land-experts.stats">
              <div className="dev-trust">
                {trustStats.map((stat) => (
                  <div key={stat.label}>
                    <stat.icon />
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
            </Boundary>
          </div>
        </section>

        <section id="projects" className="dev-section">
          <div className="dev-container">
            <Boundary id="development.services.header">
              <header className="dev-heading">
                <span className="dev-pill">Development Services</span>
                <h2>Building Utah’s Future</h2>
                <p>
                  TriCo transforms vision into reality through integrated residential and commercial
                  development.
                </p>
              </header>
            </Boundary>
            <Boundary id="development.services.items">
              <div className="dev-service-grid">
                {developmentServices.map((service) => (
                  <article className="dev-card" key={service.title}>
                    <service.icon />
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </article>
                ))}
              </div>
            </Boundary>
            <h3 className="dev-subheading">Our Projects</h3>
            <Boundary id="development.projects.categories">
              <div className="dev-category-grid">
                {(
                  [
                    [
                      'Current Projects',
                      '5 Active',
                      'Explore development projects currently in progress.',
                    ],
                    [
                      'Completed Projects',
                      '40+ Completed',
                      'See our successfully completed residential and commercial developments.',
                    ],
                  ] as const
                ).map(([title, count, description]) => (
                  <article className="dev-category" key={title}>
                    <Building2 />
                    <strong>{count}</strong>
                    <h3>{title}</h3>
                    <p>{description}</p>
                    <button className="dev-button dev-outline-gold">
                      View {title.startsWith('Current') ? 'Current' : 'Completed'}
                    </button>
                  </article>
                ))}
              </div>
            </Boundary>
            <h3 className="dev-subheading">Featured Developments</h3>
            <Boundary id="development.projects.featured">
              <div className="dev-featured-grid">
                <article>
                  <img src={featuredOne} alt="Modern Farmhouse" />
                  <div>
                    <span>Residential Development</span>
                    <h3>Modern Farmhouse</h3>
                    <p>Utah</p>
                  </div>
                </article>
                <article>
                  <img src={featuredTwo} alt="Custom Home Build" />
                  <div>
                    <span>Residential Development</span>
                    <h3>Custom Home Build</h3>
                    <p>Utah</p>
                  </div>
                </article>
              </div>
            </Boundary>
          </div>
        </section>

        <section className="dev-section dev-partners">
          <div className="dev-container">
            <Boundary id="development.partners.header">
              <header className="dev-heading">
                <span className="dev-pill dev-pill-blue">
                  <Handshake /> Trusted Partnerships
                </span>
                <h2>Builder &amp; Investor Partners</h2>
                <p>
                  We collaborate with trusted builders and investors to bring exceptional projects
                  to life.
                </p>
              </header>
            </Boundary>
            <Boundary id="development.partners.items">
              <div className="dev-partner-grid">
                {[
                  'Builder Partner 1',
                  'Builder Partner 2',
                  'Investor Partner 1',
                  'Investor Partner 2',
                  'Builder Partner 3',
                  'Investor Partner 3',
                ].map((name) => (
                  <div key={name}>{name}</div>
                ))}
              </div>
            </Boundary>
            <Boundary id="development.partners.footer">
              <p className="dev-partner-footer">
                Interested in partnering with us? <a href="#contact">Get in touch</a>.
              </p>
            </Boundary>
          </div>
        </section>

        <section id="team" className="dev-section dev-tint">
          <div className="dev-container">
            <Boundary id="development.team.header">
              <header className="dev-heading">
                <span className="dev-pill">Our Team</span>
                <h2>Development Team</h2>
                <p>Meet the professionals driving TriCo’s development success.</p>
              </header>
            </Boundary>
            <Boundary id="development.team.members">
              <div className="dev-team-grid">
                {team.map((member) => (
                  <article key={member.name}>
                    <img src={member.image} alt={member.name} />
                    <div>
                      <h3>{member.name}</h3>
                      <strong>{member.role}</strong>
                      <p>{member.bio}</p>
                    </div>
                  </article>
                ))}
              </div>
            </Boundary>
          </div>
        </section>

        <section id="about" className="dev-section">
          <div className="dev-container dev-about-grid">
            <div>
              <Boundary id="development.about">
                <span className="dev-pill">About TriCo Development</span>
                <h2>Building Communities Since 1984</h2>
                <p>
                  For over four decades, TriCo Development has transformed raw land into vibrant
                  neighborhoods and successful commercial centers.
                </p>
                <p>
                  Deep local knowledge, strong contractor relationships, and a commitment to quality
                  make us a trusted development partner.
                </p>
              </Boundary>
              <Boundary id="development.about.highlights">
                <ul className="dev-highlights">
                  {[
                    '40+ years of development experience in Utah',
                    'Comprehensive services from land acquisition to completion',
                    'Strong relationships with municipalities and contractors',
                    'Successful residential and commercial projects',
                    'Serving Utah, Idaho, and Arizona markets',
                  ].map((item) => (
                    <li key={item}>
                      <CheckCircle2 /> {item}
                    </li>
                  ))}
                </ul>
              </Boundary>
            </div>
            <Boundary id="development.about.values">
              <div className="dev-values">
                {values.map((value) => (
                  <article key={value.title}>
                    <value.icon />
                    <div>
                      <h3>{value.title}</h3>
                      <p>{value.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </Boundary>
          </div>
        </section>

        <section id="reviews" className="dev-section dev-reviews">
          <div className="dev-container">
            <Boundary id="development.reviews.header">
              <header className="dev-heading">
                <span className="dev-pill">We’d Love Your Feedback</span>
                <h2>Leave Us a Review</h2>
                <p>Your feedback helps others discover the TriCo difference.</p>
                <div className="dev-stars">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} />
                  ))}
                </div>
              </header>
            </Boundary>
            <Boundary id="development.reviews.platforms">
              <div className="dev-review-grid">
                {['Google', 'Facebook', 'Yelp'].map((name) => (
                  <article className="dev-card" key={name}>
                    <PenLine />
                    <h3>{name}</h3>
                    <p>Share your experience and help others make an informed decision.</p>
                    <a className="dev-button dev-outline" href="#contact">
                      Review on {name} <ExternalLink />
                    </a>
                  </article>
                ))}
              </div>
            </Boundary>
            <Boundary id="development.reviews.footer">
              <p className="dev-review-footer">
                Prefer to share feedback privately? Email{' '}
                <a href="mailto:Office@tricoinc.com">Office@tricoinc.com</a>.
              </p>
            </Boundary>
          </div>
        </section>

        <section id="contact" className="dev-section dev-contact">
          <div className="dev-container dev-contact-grid">
            <div>
              <Boundary id="development.contact.header">
                <span className="dev-pill">Contact Us</span>
                <h2>Let’s Build Something Great Together</h2>
                <p>
                  Have land to develop or need the right development partner? Our team is ready to
                  bring your vision to life.
                </p>
              </Boundary>
              <Boundary id="development.contact.details">
                <div className="dev-contact-list">
                  <div>
                    <MapPin />
                    <p>
                      <strong>Office Location</strong>194 West 12650 South Suite 100
                      <br />
                      Draper, UT 84020
                    </p>
                  </div>
                  <div>
                    <Phone />
                    <p>
                      <strong>Phone</strong>(801) 571-8833
                      <br />
                      <small>Fax: (801) 571-9888</small>
                    </p>
                  </div>
                  <div>
                    <Mail />
                    <p>
                      <strong>Email</strong>Office@tricoinc.com
                    </p>
                  </div>
                  <div>
                    <Clock />
                    <p>
                      <strong>Office Hours</strong>Monday – Friday: 8am – 6pm
                      <br />
                      Saturday: 9am – 1pm
                    </p>
                  </div>
                </div>
              </Boundary>
            </div>
            <DevelopmentContactForm />
          </div>
        </section>
      </main>
      <footer className="dev-footer">
        <div className="dev-container dev-footer-grid">
          <Boundary id="development.footer.brand">
            <div>
              <img src={tricoLogo} alt="TriCo Development" />
              <b>Development</b>
              <p>
                Utah’s trusted partner for land acquisition and residential and commercial
                development for over 40 years.
              </p>
              <span>
                <MapPin /> 194 W 12650 S Suite 100, Draper, UT 84020
              </span>
              <span>
                <Phone /> (801) 571-8833
              </span>
              <span>
                <Mail /> Office@tricoinc.com
              </span>
            </div>
          </Boundary>
          <Boundary id="development.footer.links">
            <div>
              <h3>Quick Links</h3>
              {navLinks.slice(0, 5).map(([label, href]) => (
                <a href={href} key={href}>
                  {label}
                </a>
              ))}
            </div>
          </Boundary>
          <Boundary id="development.footer.service-areas">
            <div>
              <h3>Service Areas</h3>
              <p>Utah</p>
              <p>Idaho</p>
              <p>Arizona</p>
            </div>
          </Boundary>
        </div>
        <Boundary id="development.footer.legal">
          <p className="dev-copyright">
            © {new Date().getFullYear()} TriCo Development. All rights reserved.
          </p>
        </Boundary>
      </footer>
      <EditorToolbar />
    </div>
  );
}

export function DevelopmentSitePage(): React.JSX.Element {
  return (
    <EditModeProvider pageId="development">
      <DevelopmentBody />
    </EditModeProvider>
  );
}
