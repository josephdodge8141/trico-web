import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  Handshake,
  Home,
  Mail,
  MapPin,
  Menu,
  PenLine,
  Phone,
  Quote,
  Ruler,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { registrySeedData } from '@app/schemas';

import benPhoto from '../assets/images/ben-beesley.jpg';
import boxwoodPhoto from '../assets/images/boxwood-dr-exterior.jpg';
import brookePhoto from '../assets/images/brooke-moore.jpeg';
import miaPhoto from '../assets/images/mia-barlow-re.png';
import michaelPhoto from '../assets/images/michael-thornton.jpg';
import placeholderPhoto from '../assets/images/placeholder-neutral.svg';
import randyPhoto from '../assets/images/randy-rimmer.png';
import commercialOnePhoto from '../assets/images/real-estate-property-1.jpeg';
import commercialTwoPhoto from '../assets/images/real-estate-property-2.jpeg';
import realEstateLogo from '../assets/images/trico-real-estate-logo.png';
import stevePhoto from '../assets/images/steve-tripp.png';
import tricoLogo from '../assets/images/trico-logo.png';
import whisper105Photo from '../assets/images/whisper-hollow-lot-105.jpg';
import whisper119Photo from '../assets/images/whisper-hollow-lot-119.jpg';
import whisperBoxwoodPhoto from '../assets/images/whisper-hollow-lot-boxwood.jpg';
import { EditableEntity } from '../components/EditableEntity.js';
import { EditorToolbar } from '../components/EditorToolbar.js';
import { EditModeProvider } from '../context/EditModeContext.js';
import { useEditMode } from '../context/editMode.js';
import { fetchPreviewPageDocument, fetchPublicPageDocument } from '../services/content.js';
import { RealEstateContactForm, RealEstateNewClientForm } from './RealEstateForms.js';
import './real-estate.css';

const navLinks = [
  ['Services', '#services'],
  ['Our Process', '#process'],
  ['Team', '#team'],
  ['About', '#about'],
  ['FAQ', '#faq'],
  ['Reviews', '#reviews'],
  ['Contact', '#contact'],
] as const;

const services: readonly { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: FileText,
    title: 'Commercial Real Estate',
    description:
      'Full-service commercial brokerage for office, retail, industrial, and investment properties.',
  },
  {
    icon: ShoppingBag,
    title: 'Land Sales & Acquisitions',
    description:
      'Expert guidance buying and selling land for residential, commercial, and investment opportunities.',
  },
  {
    icon: Handshake,
    title: 'Leasing & Tenant Placement',
    description: 'Market analysis, property showings, tenant screening, and lease negotiation.',
  },
  {
    icon: Home,
    title: 'New Construction Homes',
    description: 'Build in one of our developed subdivisions or custom build on your own lot.',
  },
  {
    icon: Building2,
    title: 'Residential Services',
    description: 'Trusted representation for residential buyers and sellers at every stage.',
  },
];

const processSteps = [
  [
    '01',
    'Discovery & Consultation',
    'We begin by understanding your goals, timeline, and budget to create a customized strategy.',
  ],
  [
    '02',
    'Market Analysis',
    'Our team conducts thorough market research and property evaluations to identify opportunities.',
  ],
  [
    '03',
    'Negotiation & Transaction',
    'We negotiate the best terms and guide you through every step of the transaction process.',
  ],
  [
    '04',
    'Closing & Transfer',
    'We coordinate all closing details, ensuring a smooth transfer of ownership.',
  ],
  [
    '05',
    'Ongoing Support',
    'Our relationship continues with market updates and guidance for your future real estate needs.',
  ],
] as const;

const listings = [
  {
    address: '1457 N Whisper Hollow Cir',
    city: 'Lehi, UT',
    price: '$512,000',
    detail: '0.56 Acres',
    type: 'Land',
    status: 'Active',
    image: whisper119Photo,
    action: 'View on MLS',
  },
  {
    address: '1604 W Box Wood Dr',
    city: 'Lehi, UT',
    price: '$521,000',
    detail: '0.46 Acres',
    type: 'Land',
    status: 'Active',
    image: whisperBoxwoodPhoto,
    action: 'View on MLS',
  },
  {
    address: '1405 N Whisper Hollow Cir',
    city: 'Lehi, UT',
    price: '$559,000',
    detail: '0.83 Acres',
    type: 'Land',
    status: 'Active',
    image: whisper105Photo,
    action: 'View on MLS',
  },
  {
    address: '9853 S 700 E',
    city: 'Sandy, UT',
    price: 'Contact for details',
    detail: 'Commercial property',
    type: 'Commercial',
    status: 'Active',
    image: commercialOnePhoto,
    action: 'View on LoopNet',
  },
  {
    address: '2560 E 3300 S',
    city: 'Salt Lake City, UT',
    price: 'Contact for details',
    detail: 'Commercial property',
    type: 'Commercial',
    status: 'Active',
    image: commercialTwoPhoto,
    action: 'View on LoopNet',
  },
  {
    address: 'LOT 110 — Boxwood Dr',
    city: 'Lehi, UT',
    price: 'Whisper Hollow Estates',
    detail: 'New Construction',
    type: 'Residential',
    status: 'Sold',
    image: boxwoodPhoto,
  },
  {
    address: '2200 State St',
    city: 'South Jordan, UT',
    price: '$3,250,000',
    detail: '22,000 sqft',
    type: 'Commercial Office',
    status: 'Sold',
    image: commercialOnePhoto,
  },
  {
    address: 'Lot 5–8, Cedar Hills',
    city: 'Cedar Hills, UT',
    price: '$1,650,000',
    detail: '12 Acres',
    type: 'Land',
    status: 'Sold',
    image: whisper105Photo,
  },
  {
    address: 'LOT 109 — Boxwood Dr',
    city: 'Lehi, UT',
    price: 'Whisper Hollow Estates',
    detail: 'New Construction',
    type: 'Residential',
    status: 'Sold',
    image: whisperBoxwoodPhoto,
  },
  {
    address: '750 Technology Way',
    city: 'Orem, UT',
    price: '$4,350,000',
    detail: '30,000 sqft',
    type: 'Industrial',
    status: 'Sold',
    image: commercialTwoPhoto,
  },
] as const;

const leaders = [
  { name: 'Stephen Tripp', role: 'Managing Broker', image: stevePhoto },
  { name: 'Randy Rimmer', role: 'Vice President', image: randyPhoto },
  { name: 'Brooke Moore', role: 'Director of Real Estate', image: brookePhoto },
] as const;
const staff = [{ name: 'Mia Barlow', role: 'Transaction Coordinator', image: miaPhoto }] as const;
const agents = [
  { name: 'Michael Thornton', role: 'Licensed Real Estate Agent', image: michaelPhoto },
  { name: 'Ben Beesley', role: 'Licensed Real Estate Agent', image: benPhoto },
  { name: 'Shauna Ayers', role: 'Licensed Real Estate Agent', image: placeholderPhoto },
  { name: 'Robert Ayers', role: 'Licensed Real Estate Agent', image: placeholderPhoto },
  { name: 'Stacie Papanikolas', role: 'Licensed Real Estate Agent', image: placeholderPhoto },
] as const;

function Boundary({
  id,
  children,
}: {
  readonly id: keyof typeof registrySeedData;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="re-entity-slot" data-real-estate-entity-boundary="true">
      <EditableEntity entityId={id} value={registrySeedData[id]}>
        {children}
      </EditableEntity>
    </div>
  );
}

function PersonGrid({
  people,
}: {
  readonly people: readonly { name: string; role: string; image: string }[];
}): React.JSX.Element {
  return (
    <div className="re-person-grid">
      {people.map((person) => (
        <article className="re-person" key={person.name}>
          <img src={person.image} alt={person.name} />
          <div>
            <h4>{person.name}</h4>
            <p>{person.role}</p>
            <a href="mailto:realestate@tricoinc.com">
              <Mail aria-hidden="true" /> Email
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

function RealEstateBody(): React.JSX.Element {
  const editing = useEditMode();
  const [fallback, setFallback] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [listingTab, setListingTab] = useState<'active' | 'sold'>('active');
  useEffect(() => {
    const controller = new AbortController();
    const loader = editing.active ? fetchPreviewPageDocument : fetchPublicPageDocument;
    void loader('real-estate', { signal: controller.signal })
      .then(() => setFallback(false))
      .catch(() => setFallback(true));
    return () => controller.abort();
  }, [editing.active, editing.disabledEntityIds, editing.pending]);
  const visibleListings = listings.filter(({ status }) => status.toLowerCase() === listingTab);
  return (
    <div className="re-page">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Boundary id="real-estate.anniversary-banner">
        <div className="re-anniversary">
          <Sparkles aria-hidden="true" /> 40+ Years of Excellence <Sparkles aria-hidden="true" />
        </div>
      </Boundary>
      <Boundary id="real-estate.header">
        <header className="re-header">
          <div className="re-container re-header-inner">
            <Link to="/" className="re-brand">
              <img src={tricoLogo} alt="TriCo Real Estate" />
              <strong>Real Estate</strong>
            </Link>
            <nav>
              {navLinks.map(([label, href]) => (
                <a href={href} key={href}>
                  {label}
                </a>
              ))}
            </nav>
            <div className="re-header-actions">
              <a href="tel:8015718833">
                <Phone aria-hidden="true" /> (801) 571-8833
              </a>
              <a href="#contact" className="re-button re-button-primary">
                Get Started
              </a>
            </div>
            <button
              className="re-menu-button"
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
          {menuOpen ? (
            <nav className="re-mobile-menu">
              {navLinks.map(([label, href]) => (
                <a href={href} onClick={() => setMenuOpen(false)} key={href}>
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
        <Boundary id="real-estate.hero">
          <section className="re-hero">
            <div className="re-container re-hero-grid">
              <div className="re-hero-copy">
                <span className="re-pill re-pill-gold">
                  <MapPin aria-hidden="true" /> Full-Service Real Estate Brokerage
                </span>
                <h1>Commercial Real Estate &amp; Land Experts</h1>
                <p>
                  TriCo Real Estate is a full-service brokerage specializing in commercial real
                  estate, land acquisitions, and new construction homes. Whatever your real estate
                  goals, we deliver results.
                </p>
                <div className="re-actions">
                  <a className="re-button re-button-light" href="#contact">
                    Start Your Journey <ArrowRight />
                  </a>
                  <a className="re-button re-button-outline" href="#services">
                    Explore Services
                  </a>
                </div>
                <Boundary id="real-estate.hero.stats">
                  <div className="re-hero-stats">
                    <div>
                      <TrendingUp />
                      <strong>$500M+</strong>
                      <span>In Transactions</span>
                    </div>
                    <div>
                      <MapPin />
                      <strong>1000+</strong>
                      <span>Properties Sold</span>
                    </div>
                    <div>
                      <Handshake />
                      <strong>40+</strong>
                      <span>Years Experience</span>
                    </div>
                  </div>
                </Boundary>
              </div>
              <div className="re-hero-visual">
                <MapPin aria-hidden="true" />
                <span>Commercial Real Estate &amp; New Construction</span>
              </div>
            </div>
          </section>
        </Boundary>

        <section id="listings" className="re-section">
          <div className="re-container">
            <Boundary id="real-estate.listings.header">
              <header className="re-section-heading">
                <span className="re-pill">Featured Properties</span>
                <h2>Featured Properties</h2>
                <p>
                  Browse current opportunities and a selection of recently sold properties across
                  Utah.
                </p>
              </header>
            </Boundary>
            <Boundary id="real-estate.listings.actions">
              <div className="re-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={listingTab === 'active'}
                  onClick={() => setListingTab('active')}
                >
                  Active Properties
                </button>
                <button
                  role="tab"
                  aria-selected={listingTab === 'sold'}
                  onClick={() => setListingTab('sold')}
                >
                  Sold Properties
                </button>
              </div>
            </Boundary>
            <Boundary id="real-estate.listings.items">
              <div className="re-listing-grid">
                {visibleListings.map((listing) => (
                  <article className="re-listing" key={listing.address}>
                    <div className="re-listing-photo">
                      <img src={listing.image} alt={listing.address} />
                      <span className={`re-badge ${listing.status === 'Sold' ? 'sold' : ''}`}>
                        {listing.status}
                      </span>
                      <span className="re-badge re-type">{listing.type}</span>
                    </div>
                    <div className="re-listing-body">
                      <strong className="re-price">{listing.price}</strong>
                      <p>
                        <MapPin /> {listing.address}, {listing.city}
                      </p>
                      <span>
                        <Ruler /> {listing.detail}
                      </span>
                      <div className="re-listing-foot">
                        <img src={realEstateLogo} alt="TriCo Real Estate" />
                        {'action' in listing ? (
                          <a href="#contact">
                            {listing.action} <ExternalLink />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </Boundary>
          </div>
        </section>

        <section id="services" className="re-section re-tint">
          <div className="re-container">
            <Boundary id="real-estate.services.header">
              <header className="re-section-heading">
                <span className="re-pill">Real Estate</span>
                <h2>Full-Service Real Estate Brokerage</h2>
                <p>
                  Commercial, land, new construction, and residential expertise—all backed by more
                  than four decades in Utah.
                </p>
              </header>
            </Boundary>
            <Boundary id="real-estate.services.items">
              <div className="re-service-grid">
                {services.map((service) => (
                  <article className="re-card" key={service.title}>
                    <service.icon />
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </article>
                ))}
              </div>
            </Boundary>
          </div>
        </section>

        <section id="process" className="re-section">
          <div className="re-container re-process-container">
            <Boundary id="real-estate.process.header">
              <header className="re-section-heading">
                <span className="re-pill">Our Process</span>
                <h2>Your Path to Success</h2>
                <p>
                  A clear, collaborative approach keeps your priorities at the center of every
                  decision.
                </p>
              </header>
            </Boundary>
            <Boundary id="real-estate.process.steps">
              <div className="re-process">
                {processSteps.map(([number, title, description], index) => (
                  <article className={index % 2 === 0 ? '' : 'reverse'} key={number}>
                    <div>
                      <span>{number}</span>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </Boundary>
          </div>
        </section>

        <section id="about" className="re-section re-dark">
          <div className="re-container re-about-grid">
            <div className="re-about-visual">
              <strong>TriCo</strong>
              <span>Real Estate Excellence</span>
              <b>
                $500M+<small>In Transactions</small>
              </b>
            </div>
            <div>
              <Boundary id="real-estate.about">
                <span className="re-pill re-pill-gold">About TriCo Real Estate</span>
                <h2>Building Relationships, Delivering Results</h2>
                <p>
                  TriCo Real Estate is a full-service brokerage specializing in commercial real
                  estate and land while also serving residential clients. For over four decades,
                  we’ve helped Utah clients navigate the property market with confidence.
                </p>
              </Boundary>
              <Boundary id="real-estate.about.features">
                <ul className="re-check-grid">
                  {[
                    '40+ Years of Local Expertise',
                    'Commercial & Investment Properties',
                    'Land Sales & Development',
                    'New Home Construction',
                    'Expert Negotiation Skills',
                    'Proven Track Record',
                  ].map((feature) => (
                    <li key={feature}>
                      <CheckCircle2 /> {feature}
                    </li>
                  ))}
                </ul>
              </Boundary>
              <a className="re-button re-button-light" href="#contact">
                Let’s Talk Real Estate
              </a>
            </div>
          </div>
        </section>

        <section id="team" className="re-section re-tint">
          <div className="re-container">
            <Boundary id="real-estate.team.header">
              <header className="re-section-heading">
                <span className="re-pill">Our Team</span>
                <h2>Meet Our Real Estate Experts</h2>
                <p>
                  Experienced professionals dedicated to exceptional results across every aspect of
                  Utah real estate.
                </p>
              </header>
            </Boundary>
            <h3 className="re-group-title">Leadership</h3>
            <Boundary id="real-estate.team.leadership">
              <PersonGrid people={leaders} />
            </Boundary>
            <h3 className="re-group-title">Our Team</h3>
            <Boundary id="real-estate.team.staff">
              <PersonGrid people={staff} />
            </Boundary>
            <h3 className="re-group-title">Our Agents</h3>
            <Boundary id="real-estate.team.agents">
              <PersonGrid people={agents} />
            </Boundary>
          </div>
        </section>

        <Boundary id="real-estate.careers">
          <section className="re-section re-careers">
            <div className="re-container re-careers-grid">
              <div>
                <span className="re-pill re-pill-gold">Careers</span>
                <h2>Join Our Growing Team</h2>
                <p>
                  Take your real estate career to the next level with a company known for integrity,
                  mentoring, and more than 40 years of market experience.
                </p>
                <ul>
                  <li>
                    <BriefcaseBusiness /> Competitive commission structure
                  </li>
                  <li>
                    <BriefcaseBusiness /> Comprehensive training and mentorship
                  </li>
                  <li>
                    <BriefcaseBusiness /> Access to exclusive listings and leads
                  </li>
                </ul>
                <a className="re-button re-button-gold" href="mailto:apply@tricoinc.com">
                  Apply Now <ArrowRight />
                </a>
              </div>
              <aside>
                <BriefcaseBusiness />
                <h3>Ready to Build Your Future?</h3>
                <p>Send your resume and cover letter to join Utah’s premier real estate team.</p>
                <a href="mailto:apply@tricoinc.com">apply@tricoinc.com</a>
              </aside>
            </div>
          </section>
        </Boundary>

        <section className="re-section re-testimonials">
          <div className="re-container">
            <Boundary id="real-estate.testimonials.header">
              <header className="re-section-heading">
                <span className="re-pill">Client Success Stories</span>
                <h2>Trusted by Property Owners &amp; Investors</h2>
                <p>Our clients’ success is our greatest achievement.</p>
              </header>
            </Boundary>
            <Boundary id="real-estate.testimonials.items">
              <div className="re-testimonial-grid">
                {[
                  [
                    'Michael Anderson',
                    'Commercial Investor',
                    'TriCo’s expertise in commercial real estate is unmatched. Their market knowledge is invaluable.',
                  ],
                  [
                    'Sarah Thompson',
                    'First-Time Homebuyer',
                    'TriCo made everything simple and stress-free. They found us the perfect home.',
                  ],
                  [
                    'David Mitchell',
                    'Land Developer',
                    'Their understanding of zoning, entitlements, and market dynamics has been instrumental.',
                  ],
                ].map(([name, role, quote]) => (
                  <article className="re-card" key={name}>
                    <Quote className="re-quote" />{' '}
                    <div className="re-stars">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} />
                      ))}
                    </div>
                    <p>“{quote}”</p>
                    <strong>{name}</strong>
                    <span>{role}</span>
                  </article>
                ))}
              </div>
            </Boundary>
          </div>
        </section>

        <section id="faq" className="re-section">
          <div className="re-container re-faq-container">
            <Boundary id="real-estate.faq.header">
              <header className="re-section-heading">
                <span className="re-pill">FAQ</span>
                <h2>Common Questions</h2>
                <p>Answers to frequently asked questions about our services and process.</p>
              </header>
            </Boundary>
            <Boundary id="real-estate.faq.items">
              <div className="re-faqs">
                {[
                  'What areas does TriCo Real Estate serve?',
                  'How does TriCo approach property listings?',
                  'What types of commercial properties do you handle?',
                  'Can TriCo help with land development projects?',
                  'What sets TriCo apart from other real estate firms?',
                  'How do I get started with TriCo Real Estate?',
                ].map((question) => (
                  <details key={question}>
                    <summary>
                      {question}
                      <ChevronDown />
                    </summary>
                    <p>
                      Our experienced team will discuss your needs and create a strategy built
                      around your goals, property, and timeline.
                    </p>
                  </details>
                ))}
              </div>
            </Boundary>
          </div>
        </section>

        <RealEstateNewClientForm />

        <section id="reviews" className="re-section re-reviews">
          <div className="re-container">
            <Boundary id="real-estate.reviews.header">
              <header className="re-section-heading">
                <span className="re-pill">We’d Love Your Feedback</span>
                <h2>Leave Us a Review</h2>
                <p>Your feedback helps others discover the TriCo difference.</p>
                <div className="re-large-stars">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} />
                  ))}
                </div>
              </header>
            </Boundary>
            <Boundary id="real-estate.reviews.platforms">
              <div className="re-review-grid">
                {['Google', 'Facebook', 'Yelp'].map((name) => (
                  <article className="re-card" key={name}>
                    <PenLine />
                    <h3>{name}</h3>
                    <p>Share your experience and help others make an informed decision.</p>
                    <a className="re-button re-button-quiet" href="#contact">
                      Review on {name} <ExternalLink />
                    </a>
                  </article>
                ))}
              </div>
            </Boundary>
            <Boundary id="real-estate.reviews.footer">
              <p className="re-review-footer">
                Prefer to share feedback privately? Email{' '}
                <a href="mailto:Office@tricoinc.com">Office@tricoinc.com</a>.
              </p>
            </Boundary>
          </div>
        </section>

        <section id="contact" className="re-section re-contact">
          <div className="re-container re-contact-grid">
            <div>
              <Boundary id="real-estate.contact.header">
                <span className="re-pill">Contact Us</span>
                <h2>Let’s Discuss Your Real Estate Goals</h2>
                <p>
                  Whether you’re looking to buy, sell, lease, or develop property, our team is ready
                  to help.
                </p>
              </Boundary>
              <Boundary id="real-estate.contact.details">
                <div className="re-contact-list">
                  <div>
                    <MapPin />
                    <p>
                      <strong>Office Location</strong>194 West 12650 South Suite 200
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
                      <strong>Email</strong>realestate@tricoinc.com
                    </p>
                  </div>
                  <div>
                    <Clock />
                    <p>
                      <strong>Office Hours</strong>Monday – Friday: 8am – 4pm
                    </p>
                  </div>
                </div>
              </Boundary>
            </div>
            <RealEstateContactForm />
          </div>
        </section>
      </main>
      <footer className="re-footer">
        <div className="re-container re-footer-grid">
          <Boundary id="real-estate.footer.brand">
            <div>
              <img src={tricoLogo} alt="TriCo Real Estate" />
              <p>
                Utah’s trusted partner for residential and commercial real estate, land acquisition,
                and property development for over 40 years.
              </p>
              <span>
                <MapPin /> 194 W 12650 S Suite 200, Draper, UT 84020
              </span>
              <span>
                <Phone /> (801) 571-8833
              </span>
              <span>
                <Mail /> realestate@tricoinc.com
              </span>
            </div>
          </Boundary>
          <Boundary id="real-estate.footer.links">
            <div>
              <h3>Quick Links</h3>
              {navLinks.slice(0, 5).map(([label, href]) => (
                <a href={href} key={href}>
                  {label}
                </a>
              ))}
            </div>
          </Boundary>
          <Boundary id="real-estate.footer.license">
            <div>
              <h3>Brokerage License</h3>
              <p>REALTOR® License# 5472329-CN00</p>
            </div>
          </Boundary>
        </div>
        <Boundary id="real-estate.footer.legal">
          <p className="re-copyright">
            © {new Date().getFullYear()} TriCo Real Estate. All rights reserved.
          </p>
        </Boundary>
      </footer>
      <EditorToolbar />
    </div>
  );
}

export function RealEstateSitePage(): React.JSX.Element {
  return (
    <EditModeProvider pageId="real-estate">
      <RealEstateBody />
    </EditModeProvider>
  );
}
