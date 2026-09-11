import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Boxes,
  Building,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  HardHat,
  Home,
  Lock,
  Mail,
  MapPin,
  Menu,
  PenLine,
  Phone,
  Shield,
  Shovel,
  Star,
  TrendingUp,
  Users,
  Warehouse,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import cayliePhoto from '../assets/images/caylie-disney.jpg';
import crewOne from '../assets/images/construction-crew-1.jpg';
import crewTwo from '../assets/images/construction-crew-2.jpg';
import katiePhoto from '../assets/images/katie-thompson.jpg';
import randyPhoto from '../assets/images/randy-rimmer.png';
import tricoLogo from '../assets/images/trico-logo.png';
import { EditableEntity } from '../components/EditableEntity.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import './construction.css';

const categories = [
  ['multi-family', 'Multi Family', 'Apartments, townhomes, and condominium communities.'],
  ['retail', 'Retail', 'Shopping centers, pads, and tenant spaces.'],
  ['office-ti', 'Office / TI', 'Ground-up offices and tenant improvement build-outs.'],
  ['medical-dental', 'Medical / Dental', 'Clinics, dental suites, and specialty facilities.'],
  ['industrial', 'Industrial', 'Warehouse, flex, and manufacturing facilities.'],
  ['storage', 'Storage', 'Self-storage and RV or boat storage facilities.'],
  ['subdivisions', 'Subdivisions', 'Residential subdivisions and final lot delivery.'],
  ['underground', 'Underground', 'Wet and dry utilities, storm drain, sewer, and infrastructure.'],
] as const;

const services: readonly [LucideIcon, string, string][] = [
  [
    Boxes,
    'Concrete',
    'Expert foundations, flatwork, retaining walls, and decorative concrete for residential and commercial projects.',
  ],
  [
    Building2,
    'Multi-Housing',
    'Complete multi-family construction from ground-up builds to major apartment, condo, and townhome renovations.',
  ],
  [
    Shovel,
    'Underground Utilities',
    'Professional water, sewer, storm drain, and utility infrastructure installation.',
  ],
  [
    Wrench,
    'Excavation',
    'Site preparation, grading, trenching, and earthwork for projects of every size.',
  ],
  [
    Home,
    'Office Construction & Remodels',
    'Commercial offices and tenant improvements tailored to business needs.',
  ],
  [
    Warehouse,
    'Storage Facilities',
    'Design-build services for climate-controlled and traditional self-storage facilities.',
  ],
];

const plans = [
  ['Draper Mixed-Use Development', 'TCC-2026-014', 'Aug 12, 2026', '42 sheets', 'Rev D'],
  ['Lehi Multi-Housing Phase II', 'TCC-2026-011', 'Aug 5, 2026', '36 sheets', 'Rev B'],
  ['Saratoga Springs Storage Facility', 'TCC-2026-009', 'Jul 28, 2026', '24 sheets', 'Rev C'],
  ['Tucson Commercial Office Build-Out', 'TCC-2026-007', 'Jul 19, 2026', '31 sheets', 'Rev A'],
] as const;

const pros: readonly [LucideIcon, string, string][] = [
  [
    HardHat,
    'Experienced Crews',
    'Decades of combined experience ensure quality workmanship from start to finish.',
  ],
  [
    Award,
    'Licensed & Insured',
    'Licensed in Utah, Arizona, and Idaho with comprehensive insurance coverage.',
  ],
  [Clock, 'On-Time Delivery', 'Disciplined project management keeps construction on schedule.'],
  [Shield, 'Safety First', 'Zero-compromise safety protocols protect workers and property.'],
  [
    Users,
    'Dedicated Project Managers',
    'One point of contact keeps communication clear from bid to completion.',
  ],
  [
    Wrench,
    'Quality Equipment',
    'Modern, well-maintained equipment supports efficient, high-quality results.',
  ],
];

const team = [
  ['Randy Rimmer', 'Vice President', randyPhoto, 'randy@tricoinc.com'],
  ['Katie Thompson', 'Project Coordinator', katiePhoto, ''],
  ['Caylie Disney', 'Equipment Assistant', cayliePhoto, ''],
] as const;

const benefits: readonly [LucideIcon, string, string][] = [
  [TrendingUp, 'Career Growth', 'Training and promotion opportunities'],
  [Users, 'Great Team', 'Experienced professionals in a supportive environment'],
  [Shield, 'Competitive Benefits', 'Health insurance, 401k, paid time off, and more'],
];

function Entity({
  id,
  value,
  children,
}: {
  readonly id: string;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <EditableEntity entityId={id} value={value}>
      {children}
    </EditableEntity>
  );
}

function Heading({
  eyebrow,
  title,
  copy,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly copy: string;
}): React.JSX.Element {
  return (
    <header className="co-heading">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </header>
  );
}

function ClientForm({ variant }: { readonly variant: 'bid' | 'contact' }): React.JSX.Element {
  const [sent, setSent] = useState(false);
  const isBid = variant === 'bid';
  return (
    <form
      className="co-form"
      onSubmit={(event) => {
        event.preventDefault();
        event.currentTarget.reset();
        setSent(true);
      }}
    >
      <div className="co-form-row">
        <label>
          {isBid ? 'Your Name' : 'First Name'} *
          <input required name="firstName" placeholder={isBid ? 'John Smith' : 'John'} />
        </label>
        <label>
          {isBid ? 'Company Name' : 'Last Name'}
          {isBid ? '' : ' *'}
          <input
            required={!isBid}
            name="lastName"
            placeholder={isBid ? 'ABC Development LLC' : 'Doe'}
          />
        </label>
      </div>
      <div className="co-form-row">
        <label>
          Email *<input required type="email" name="email" placeholder="john@example.com" />
        </label>
        <label>
          Phone *<input required type="tel" name="phone" placeholder="(801) 555-1234" />
        </label>
      </div>
      {isBid ? (
        <>
          <label>
            Project Location *<input required name="location" placeholder="City, State" />
          </label>
          <label>
            Project Type *
            <select required name="projectType" defaultValue="">
              <option value="" disabled>
                Select project type...
              </option>
              <option>Concrete Work</option>
              <option>Multi-Housing Development</option>
              <option>Underground Utilities</option>
              <option>Excavation</option>
              <option>Office Construction/Remodel</option>
              <option>Storage Facility</option>
              <option>Other</option>
            </select>
          </label>
        </>
      ) : (
        <label>
          Project Type
          <input name="projectType" placeholder="Concrete, Multi-Housing, Commercial" />
        </label>
      )}
      <label>
        {isBid ? 'Project Description *' : 'Project Details'}
        <textarea
          required={isBid}
          name="message"
          rows={isBid ? 5 : 4}
          placeholder="Tell us about your construction project..."
        />
      </label>
      <button className="co-button co-button-gold" type="submit">
        {isBid ? 'Request Your Bid' : 'Get Quote'} <ArrowRight aria-hidden="true" />
      </button>
      {sent ? (
        <p className="co-form-success" role="status">
          Thank you. A construction specialist will contact you soon.
        </p>
      ) : null}
    </form>
  );
}

function ConstructionBody(): React.JSX.Element {
  const editing = useEditMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('construction', { signal: controller.signal })
      .then(() => {
        if (!controller.signal.aborted) setFallback(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFallback(true);
      });
    return () => controller.abort();
  }, [editing.active, editing.disabledEntityIds, editing.pending]);
  const nav = [
    ['Services', 'services'],
    ['Projects', 'projects'],
    ['Plan Room', 'plan-room'],
    ["Our Pro's", 'pros'],
    ['Our Team', 'team'],
    ['Get a Bid', 'bid'],
    ['Careers', 'careers'],
    ['Contact', 'contact'],
  ] as const;
  return (
    <div className="co-page">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Entity id="construction.anniversary-banner" value={{ message: '40+ Years of Excellence' }}>
        <div className="co-anniversary">
          ✦ <strong>40+ Years of Excellence</strong> ✦
        </div>
      </Entity>
      <Entity id="construction.header" value={{ nav }}>
        <header className="co-header">
          <div className="co-container co-header-inner">
            <Link className="co-brand" to="/">
              <img src={tricoLogo} alt="TriCo Construction" />
              <strong>Construction</strong>
            </Link>
            <nav aria-label="Primary navigation">
              {nav.map(([label, anchor]) => (
                <a key={anchor} href={`#${anchor}`}>
                  {label}
                </a>
              ))}
            </nav>
            <div className="co-header-actions">
              <a href="tel:8015718833">
                <Phone /> (801) 571-8833
              </a>
              <a className="co-button co-button-blue" href="#contact">
                Get Quote
              </a>
            </div>
            <button
              className="co-menu"
              type="button"
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
          {menuOpen ? (
            <nav className="co-mobile-nav" aria-label="Mobile navigation">
              {nav.map(([label, anchor]) => (
                <a key={anchor} href={`#${anchor}`} onClick={() => setMenuOpen(false)}>
                  {label}
                </a>
              ))}
              <a href="tel:8015718833">(801) 571-8833</a>
            </nav>
          ) : null}
        </header>
      </Entity>
      {fallback ? (
        <div className="content-notice" role="status">
          Showing the checked-in site content while published content is unavailable.
        </div>
      ) : null}
      <main id="main-content">
        <Entity id="construction.hero" value={{ heading: 'Building The Future' }}>
          <section className="co-hero">
            <div className="co-container co-hero-grid">
              <div>
                <div className="co-pills">
                  <span>
                    <HardHat /> Premier Construction Partner
                  </span>
                  <span>Servicing Utah, Idaho & Arizona</span>
                </div>
                <h1>Building The Future</h1>
                <h2>in Utah, Idaho & Arizona</h2>
                <h3>Every Phase. Every Detail. Our Work Matters.</h3>
                <p>
                  From concrete foundations to complete commercial builds, TriCo Construction
                  delivers quality craftsmanship and reliable results on every project.
                </p>
                <div className="co-actions">
                  <a className="co-button co-button-gold" href="#contact">
                    Get a Quote <ArrowRight />
                  </a>
                  <a className="co-button co-button-outline" href="#services">
                    Our Services
                  </a>
                </div>
                <Entity id="construction.hero.stats" value={['40+', '500+', '3']}>
                  <div className="co-hero-stats">
                    {[
                      [Clock, '40+', 'Years Experience'],
                      [Building, '500+', 'Projects Completed'],
                      [HardHat, '3', 'States Served'],
                    ].map(([Icon, value, label]) => {
                      const StatIcon = Icon as LucideIcon;
                      return (
                        <div key={String(label)}>
                          <strong>
                            <StatIcon />
                            {String(value)}
                          </strong>
                          <span>{String(label)}</span>
                        </div>
                      );
                    })}
                  </div>
                </Entity>
              </div>
              <img src={crewOne} alt="TriCo construction crew standing outdoors" />
            </div>
          </section>
        </Entity>

        <section className="co-section co-tint" id="services">
          <div className="co-container">
            <Entity
              id="construction.services.header"
              value={{ heading: 'Comprehensive Construction Solutions' }}
            >
              <Heading
                eyebrow="Our Services"
                title="Comprehensive Construction Solutions"
                copy="From site preparation to final finishes, TriCo Construction delivers quality craftsmanship across Utah, Arizona, and Idaho."
              />
            </Entity>
            <Entity id="construction.services.items" value={services.map(([, title]) => title)}>
              <div className="co-card-grid">
                {services.map(([Icon, title, copy]) => (
                  <article className="co-card" key={title}>
                    <i>
                      <Icon />
                    </i>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </article>
                ))}
              </div>
            </Entity>
          </div>
        </section>

        {(['current', 'completed'] as const).map((status) => {
          const prefix = `construction.${status === 'current' ? 'current-projects' : 'completed-projects'}`;
          return (
            <section
              className={`co-section ${status === 'completed' ? 'co-soft' : ''}`}
              id={status === 'current' ? 'projects' : 'completed-projects'}
              key={status}
            >
              <div className="co-container">
                <Entity id={`${prefix}.header`} value={{ status }}>
                  <Heading
                    eyebrow={status === 'current' ? 'Current Projects' : 'Completed Projects'}
                    title="Built Across Every Sector"
                    copy={`Select a sector to view our ${status === 'current' ? 'active construction projects' : 'completed work'}.`}
                  />
                </Entity>
                <div className="co-sector-grid">
                  {categories.map(([slug, label, blurb]) => (
                    <Entity key={slug} id={`${prefix}.category.${slug}`} value={{ label, blurb }}>
                      <Link className="co-sector" to={`/construction/${status}/${slug}`}>
                        <h3>{label}</h3>
                        <p>{blurb}</p>
                        <span>
                          View projects <ArrowRight />
                        </span>
                      </Link>
                    </Entity>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        <section className="co-section co-tint" id="plan-room">
          <div className="co-container">
            <Entity id="construction.plan-room.header" value={{ heading: 'Plan Room' }}>
              <Heading
                eyebrow="Subcontractor Access"
                title="Plan Room"
                copy="Current subcontractors can access the latest project plans, drawings, and specifications. Always confirm you are working from the latest set."
              />
            </Entity>
            <Entity id="construction.plan-room.access-notice" value={{ heading: 'Login Required' }}>
              <div className="co-notice">
                <Lock />
                <div>
                  <h3>Login Required</h3>
                  <p>
                    Plan access is restricted to approved subcontractors and vendors. Request
                    credentials below.
                  </p>
                </div>
              </div>
            </Entity>
            <h3 className="co-subheading">
              <FolderOpen /> Current Project Plans
            </h3>
            <Entity id="construction.plan-room.plan-sets" value={plans.map(([name]) => name)}>
              <div className="co-plan-grid">
                {plans.map(([name, number, date, sheets, rev]) => (
                  <article className="co-plan" key={number}>
                    <header>
                      <i>
                        <FileText />
                      </i>
                      <div>
                        <h3>{name}</h3>
                        <small>{number}</small>
                      </div>
                      <b>{rev}</b>
                    </header>
                    <p>
                      <Calendar /> {date} <FileText /> {sheets}
                    </p>
                    <div>
                      <button type="button">View Plans</button>
                      <button type="button">
                        Specs <ExternalLink />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </Entity>
            <Entity
              id="construction.plan-room.request-access"
              value={{ heading: 'Need Plan Room Access?' }}
            >
              <div className="co-plan-access">
                <h3>Need Plan Room Access?</h3>
                <p>
                  Subcontractors and vendors can request login credentials to view the latest
                  drawings.
                </p>
                <a
                  className="co-button co-button-blue"
                  href="mailto:Office@tricoinc.com?subject=Plan%20Room%20Access%20Request"
                >
                  Request Access <ArrowRight />
                </a>
              </div>
            </Entity>
          </div>
        </section>

        <section className="co-section" id="pros">
          <div className="co-container">
            <Entity id="construction.pros.header" value={{ heading: "Our Pro's" }}>
              <Heading
                eyebrow="Why Choose TriCo"
                title="Our Pro's"
                copy="With 40+ years building across the Mountain West, this is what sets TriCo Construction apart."
              />
            </Entity>
            <Entity id="construction.pros.items" value={pros.map(([, title]) => title)}>
              <div className="co-card-grid">
                {pros.map(([Icon, title, copy]) => (
                  <article className="co-card" key={title}>
                    <i className="co-blue-icon">
                      <Icon />
                    </i>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </article>
                ))}
              </div>
            </Entity>
            <Entity id="construction.pros.stats" value={['40+', '500+', '3', '100%']}>
              <div className="co-pro-stats">
                {[
                  ['40+', 'Years Experience'],
                  ['500+', 'Projects Completed'],
                  ['3', 'States Served'],
                  ['100%', 'Client Focused'],
                ].map(([value, label]) => (
                  <div key={label}>
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </Entity>
          </div>
        </section>

        <section className="co-section co-soft" id="team">
          <div className="co-container">
            <Entity id="construction.team.header" value={{ heading: 'Our Construction Experts' }}>
              <Heading
                eyebrow="Our Team"
                title="Our Construction Experts"
                copy="Experienced professionals who lead every project with dedication and a commitment to excellence."
              />
            </Entity>
            <Entity id="construction.team.members" value={team.map(([name]) => name)}>
              <div className="co-team-grid">
                {team.map(([name, title, photo, email]) => (
                  <article className="co-team-card" key={name}>
                    <img src={photo} alt={name} />
                    <h3>{name}</h3>
                    <strong>{title}</strong>
                    {email === '' ? null : (
                      <a href={`mailto:${email}`}>
                        <Mail />
                        {email}
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </Entity>
          </div>
        </section>

        <Entity id="construction.workers" value={{ heading: 'Our Construction Crew' }}>
          <section className="co-section co-workers">
            <div className="co-container">
              <Heading
                eyebrow="In the Field"
                title="Our Construction Crew"
                copy="The hardworking professionals who bring every project to life with quality craftsmanship."
              />
              <img src={crewTwo} alt="TriCo construction crew posing with heavy equipment" />
            </div>
          </section>
        </Entity>

        <Entity
          id="construction.about"
          value={{ heading: 'Building & Developing in Utah Since 1984' }}
        >
          <section className="co-section co-about" id="about">
            <div className="co-container co-about-grid">
              <div className="co-about-art">
                <span>TriCo</span>
                <small>Construction Excellence</small>
                <aside>
                  <strong>500+</strong>Projects Completed
                </aside>
              </div>
              <div>
                <span className="co-about-pill">About TriCo Construction</span>
                <h2>Building & Developing in Utah Since 1984</h2>
                <p>
                  For over four decades, TriCo Construction has been building Utah's future. Our
                  commitment to quality, safety, and customer satisfaction has made us a trusted
                  partner.
                </p>
                <p>
                  From concrete foundations to complete commercial builds, our experienced team
                  delivers exceptional results on every project.
                </p>
                <Entity
                  id="construction.about.features"
                  value={['40+ Years', 'Licensed', 'On-Time', 'Competitive', 'Quality', 'Safety']}
                >
                  <div className="co-checks">
                    {[
                      '40+ Years of Construction Excellence',
                      'Licensed in Utah, Arizona & Idaho',
                      'On-Time Project Delivery',
                      'Competitive Pricing',
                      'Quality Craftsmanship',
                      'Safety First Culture',
                    ].map((item) => (
                      <span key={item}>
                        <CheckCircle2 />
                        {item}
                      </span>
                    ))}
                  </div>
                </Entity>
                <a className="co-button co-button-gold" href="#contact">
                  Start Your Project
                </a>
              </div>
            </div>
          </section>
        </Entity>

        <section className="co-section co-bid" id="bid">
          <div className="co-container co-narrow">
            <Entity id="construction.bid.header" value={{ heading: 'Get a Bid on Your Project' }}>
              <Heading
                eyebrow="Free Project Estimate"
                title="Get a Bid on Your Project"
                copy="Tell us about your project and receive a detailed, competitive bid from our experienced team. No obligation, no pressure."
              />
            </Entity>
            <ClientForm variant="bid" />
          </div>
        </section>

        <section className="co-section co-careers" id="careers">
          <div className="co-container co-career-grid">
            <div>
              <Entity
                id="construction.careers.header"
                value={{ heading: 'Build Your Career with TriCo Construction' }}
              >
                <Heading
                  eyebrow="Join Our Team"
                  title="Build Your Career with TriCo Construction"
                  copy="We are always looking for skilled professionals across Utah, Idaho, and Arizona."
                />
              </Entity>
              <Entity id="construction.careers.benefits" value={benefits.map(([, title]) => title)}>
                <div className="co-benefits">
                  {benefits.map(([Icon, title, copy]) => (
                    <div key={title}>
                      <i>
                        <Icon />
                      </i>
                      <span>
                        <strong>{title}</strong>
                        <small>{copy}</small>
                      </span>
                    </div>
                  ))}
                </div>
              </Entity>
              <a className="co-button co-button-blue" href="mailto:apply@tricoinc.com">
                Apply Now <ArrowRight />
              </a>
            </div>
            <Entity
              id="construction.careers.open-positions"
              value={[
                'Concrete Finisher',
                'Equipment Operator',
                'Project Manager',
                'Laborer',
                'Estimator',
              ]}
            >
              <aside className="co-positions">
                <h3>Open Positions</h3>
                {[
                  'Concrete Finisher',
                  'Equipment Operator',
                  'Project Manager',
                  'Laborer',
                  'Estimator',
                ].map((position) => (
                  <div key={position}>
                    <strong>{position}</strong>
                    <span>Multiple Locations</span>
                  </div>
                ))}
              </aside>
            </Entity>
          </div>
        </section>

        <section className="co-section co-reviews" id="reviews">
          <div className="co-container">
            <Entity id="construction.reviews.header" value={{ heading: 'Leave Us a Review' }}>
              <Heading
                eyebrow="We'd Love Your Feedback"
                title="Leave Us a Review"
                copy="Your feedback helps others discover the TriCo difference. Pick your favorite platform below."
              />
            </Entity>
            <div className="co-stars" aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }, (_, index) => (
                <Star key={index} />
              ))}
            </div>
            <Entity id="construction.reviews.platforms" value={['Google', 'Facebook', 'Yelp']}>
              <div className="co-review-grid">
                {['Google', 'Facebook', 'Yelp'].map((name) => (
                  <article key={name}>
                    <i>
                      <PenLine />
                    </i>
                    <h3>{name}</h3>
                    <p>Share your experience and help others make an informed decision.</p>
                    <a href="#reviews">
                      Review on {name} <ExternalLink />
                    </a>
                  </article>
                ))}
              </div>
            </Entity>
            <Entity id="construction.reviews.footer" value={{ email: 'Office@tricoinc.com' }}>
              <p className="co-review-footer">
                Prefer to share feedback privately? Email{' '}
                <a href="mailto:Office@tricoinc.com">Office@tricoinc.com</a>.
              </p>
            </Entity>
          </div>
        </section>

        <section className="co-section co-contact" id="contact">
          <div className="co-container co-contact-grid">
            <div>
              <Entity
                id="construction.contact.header"
                value={{ heading: 'Ready to Start Your Project?' }}
              >
                <Heading
                  eyebrow="Contact Us"
                  title="Ready to Start Your Project?"
                  copy="Contact our team for a free project consultation and quote."
                />
              </Entity>
              <Entity
                id="construction.contact.details"
                value={{ phone: '(801) 571-8833', email: 'Office@tricoinc.com' }}
              >
                <div className="co-contact-list">
                  <p>
                    <i>
                      <MapPin />
                    </i>
                    <span>
                      <strong>Office Location</strong>194 West 12650 South Suite 100
                      <br />
                      Draper, UT 84020
                    </span>
                  </p>
                  <p>
                    <i>
                      <Phone />
                    </i>
                    <span>
                      <strong>Phone</strong>
                      <a href="tel:8015718833">(801) 571-8833</a>
                      <small>Fax: (801) 571-9888</small>
                    </span>
                  </p>
                  <p>
                    <i>
                      <Mail />
                    </i>
                    <span>
                      <strong>Email</strong>
                      <a href="mailto:Office@tricoinc.com">Office@tricoinc.com</a>
                    </span>
                  </p>
                  <p>
                    <i>
                      <Clock />
                    </i>
                    <span>
                      <strong>Office Hours</strong>Monday - Friday: 7am - 5pm
                    </span>
                  </p>
                </div>
              </Entity>
            </div>
            <div className="co-contact-form">
              <h3>Request a Quote</h3>
              <ClientForm variant="contact" />
            </div>
          </div>
        </section>
      </main>
      <footer className="co-footer">
        <div className="co-container co-footer-grid">
          <Entity
            id="construction.footer.brand"
            value={{ description: "Utah's trusted construction partner" }}
          >
            <div>
              <img src={tricoLogo} alt="TriCo Construction" />
              <p>
                Utah's trusted construction partner for over 40 years. Quality craftsmanship on
                every project.
              </p>
              <address>
                194 W 12650 S Suite 100, Draper, UT 84020
                <br />
                <a href="tel:8015718833">(801) 571-8833</a>
                <br />
                <a href="mailto:Office@tricoinc.com">Office@tricoinc.com</a>
              </address>
            </div>
          </Entity>
          <Entity id="construction.footer.links" value={services.map(([, title]) => title)}>
            <nav aria-label="Quick links">
              <h3>Quick Links</h3>
              {[
                'Concrete',
                'Multi-Housing',
                'Underground Utilities',
                'Excavation',
                'Office Construction',
                'Projects',
                'Contact',
              ].map((link) => (
                <a
                  href={
                    link === 'Contact'
                      ? '#contact'
                      : link === 'Projects'
                        ? '#projects'
                        : '#services'
                  }
                  key={link}
                >
                  {link}
                </a>
              ))}
            </nav>
          </Entity>
          <Entity id="construction.footer.licenses" value={{ licenses: ['UT', 'AZ', 'ID'] }}>
            <div>
              <h3>Licenses</h3>
              <p>UT GC LIC# 252522-5501</p>
              <p>AZ LIC ROC# 337048</p>
              <p>ID LIC RCE# 54338</p>
            </div>
          </Entity>
        </div>
        <Entity id="construction.footer.legal" value={{ copyright: 'TriCo Construction' }}>
          <p className="co-legal">
            © {new Date().getFullYear()} TriCo Construction. All rights reserved.
          </p>
        </Entity>
      </footer>
      <EditorToolbar />
    </div>
  );
}

export function ConstructionSitePage(): React.JSX.Element {
  return (
    <EditModeProvider pageId="construction">
      <ConstructionBody />
    </EditModeProvider>
  );
}
