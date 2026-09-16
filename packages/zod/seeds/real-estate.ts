const managed = (key: string) => ({ kind: 'managed' as const, key });
const namespace = 'c63b8c48-2f88-5a33-9b55-f5430eb6764a';
function hash(value: string, seed: number): number {
  let result = seed >>> 0;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16_777_619);
  }
  return result >>> 0;
}
function itemId(entityId: string, position: number): string {
  const input = `${namespace}:${entityId}:${position}`;
  const hex = [
    2_166_136_261,
    2_166_136_261 ^ 0x9e3779b9,
    2_166_136_261 ^ 0x85ebca6b,
    2_166_136_261 ^ 0xc2b2ae35,
  ]
    .map((seed) => hash(input, seed).toString(16).padStart(8, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
const heading = (eyebrow: string, title: string, description: string) => ({
  eyebrow,
  heading: title,
  description,
});

export const realEstateV2SeedData = {
  'real-estate.anniversary-banner': { message: '40+ Years of Excellence' },
  'real-estate.header': {
    logo: managed('media/seed/trico-logo.png'),
    logoAltText: 'TriCo Real Estate',
    divisionLabel: 'Real Estate',
    phone: '(801) 571-8833',
    actionLabel: 'Get Started',
    navLinks: ['Services', 'Our Process', 'Team', 'About', 'FAQ', 'Reviews', 'Contact'].map(
      (label, n) => ({
        id: itemId('real-estate.header', n),
        label,
        destination:
          (['services', 'process', 'team', 'about', 'faq', 'reviews', 'contact'] as const)[n] ??
          'services',
      }),
    ),
  },
  'real-estate.hero': {
    badge: 'Full-Service Real Estate Brokerage',
    heading: 'Commercial Real Estate & Land Experts',
    description:
      'TriCo Real Estate is a full-service brokerage specializing in commercial real estate, land acquisitions, and new construction homes. Whatever your real estate goals, we deliver results.',
    primaryActionLabel: 'Start Your Journey',
    secondaryActionLabel: 'Explore Services',
  },
  'real-estate.hero.stats': [
    ['$500M+', 'In Transactions', 'TrendingUp'],
    ['1000+', 'Properties Sold', 'MapPin'],
    ['40+', 'Years Experience', 'Handshake'],
  ].map(([value, label, icon], n) => ({
    id: itemId('real-estate.hero.stats', n),
    value: value ?? '0',
    label: label ?? 'Statistic',
    icon: icon ?? 'TrendingUp',
  })),
  'real-estate.listings.header': heading(
    'Our Listings',
    'Featured Properties',
    'Browse current commercial properties, land listings, and recently completed transactions across Utah.',
  ),
  'real-estate.listings.items': [
    [
      '1457 N Whisper Hollow Cir',
      'Lehi, UT',
      '$512,000',
      '0.56 Acres',
      'Land',
      'active',
      'whisper-hollow-lot-119.jpg',
      'https://www.utahrealestate.com/2019235',
    ],
    [
      '1604 W Box Wood Dr',
      'Lehi, UT',
      '$521,000',
      '0.46 Acres',
      'Land',
      'active',
      'whisper-hollow-lot-boxwood.jpg',
      'https://www.utahrealestate.com/2019250',
    ],
    [
      '1405 N Whisper Hollow Cir',
      'Lehi, UT',
      '$559,000',
      '0.83 Acres',
      'Land',
      'active',
      'whisper-hollow-lot-105.jpg',
      'https://www.utahrealestate.com/2019286',
    ],
    [
      '9853 S 700 E',
      'Sandy, UT',
      'Contact for details',
      'Commercial property',
      'Commercial',
      'active',
      'real-estate-property-1.jpeg',
      'https://www.loopnet.com/Listing/9853-S-700-E-Sandy-UT/37111521/',
    ],
    [
      '2560 E 3300 S',
      'Salt Lake City, UT',
      'Contact for details',
      'Commercial property',
      'Commercial',
      'active',
      'real-estate-property-2.jpeg',
      'https://www.loopnet.com/Listing/2560-E-3300-S-Salt-Lake-City-UT/39291246/',
    ],
    [
      'LOT 110 — Boxwood Dr',
      'Lehi, UT',
      'Whisper Hollow Estates',
      'New Construction',
      'Residential',
      'sold',
      'boxwood-dr-exterior.jpg',
      '',
    ],
    [
      '2200 State St',
      'South Jordan, UT',
      '$3,250,000',
      '22,000 sqft',
      'Commercial Office',
      'sold',
      'real-estate-property-1.jpeg',
      '',
    ],
    [
      'Lot 5–8, Cedar Hills',
      'Cedar Hills, UT',
      '$1,650,000',
      '12 Acres',
      'Land',
      'sold',
      'whisper-hollow-lot-105.jpg',
      '',
    ],
    [
      'LOT 109 — Boxwood Dr',
      'Lehi, UT',
      'Whisper Hollow Estates',
      'New Construction',
      'Residential',
      'sold',
      'whisper-hollow-lot-boxwood.jpg',
      '',
    ],
    [
      '750 Technology Way',
      'Orem, UT',
      '$4,350,000',
      '30,000 sqft',
      'Industrial',
      'sold',
      'real-estate-property-2.jpeg',
      '',
    ],
  ].map(([address, city, price, detail, type, status, image, externalUrl], n) => ({
    id: itemId('real-estate.listings.items', n),
    address: address ?? 'New listing',
    city: city ?? 'Draper, UT',
    price: price ?? 'Contact for details',
    detail: detail ?? 'Property details',
    type: type ?? 'Property',
    status: status === 'active' ? ('active' as const) : ('sold' as const),
    image: managed(`media/seed/${image ?? 'placeholder-neutral.svg'}`),
    imageAltText: `${address ?? 'Property'}, ${city ?? 'Draper, UT'}`,
    gallery:
      n === 5
        ? [
            'boxwood-dr-exterior.jpg',
            'boxwood-dr-kitchen.jpg',
            'boxwood-dr-living.jpg',
            'boxwood-dr-bathroom.jpg',
            'boxwood-dr-theater.jpg',
            'boxwood-dr-basement.jpg',
          ].map((key, galleryIndex) => ({
            id: itemId(`real-estate.listings.items.${String(n)}.gallery`, galleryIndex),
            image: managed(`media/seed/${key}`),
            imageAltText: `${address ?? 'Property'} photo ${String(galleryIndex + 1)}`,
          }))
        : n === 8
          ? [
              'boxwood-109-exterior-1.jpg',
              'boxwood-109-exterior-2.jpg',
              'boxwood-109-kitchen-1.jpg',
              'boxwood-109-kitchen-2.jpg',
              'boxwood-109-kitchen-3.jpg',
              'boxwood-109-living-1.jpg',
              'boxwood-109-living-2.jpg',
              'boxwood-109-living-3.jpg',
              'boxwood-109-living-4.jpg',
              'boxwood-109-entry.jpg',
            ].map((key, galleryIndex) => ({
              id: itemId(`real-estate.listings.items.${String(n)}.gallery`, galleryIndex),
              image: managed(`media/seed/${key}`),
              imageAltText: `${address ?? 'Property'} photo ${String(galleryIndex + 1)}`,
            }))
          : [],
    actionLabel: status === 'active' ? 'View listing' : '',
    externalUrl: externalUrl ?? '',
  })),
  'real-estate.listings.actions': {
    activeLabel: 'Active Listings',
    soldLabel: 'Sold',
    directoryLinks: [
      {
        id: itemId('real-estate.listings.actions.directoryLinks', 0),
        label: 'Browse on MLS',
        externalUrl: 'https://www.utahrealestate.com/',
      },
      {
        id: itemId('real-estate.listings.actions.directoryLinks', 1),
        label: 'Browse on LoopNet',
        externalUrl: 'https://www.loopnet.com/',
      },
    ],
    contactActionLabel: 'Looking for something specific? Contact us',
  },
  'real-estate.services.header': heading(
    'Real Estate',
    'Full-Service Real Estate Brokerage',
    'Commercial, land, new construction, and residential expertise backed by four decades in Utah.',
  ),
  'real-estate.services.items': [
    [
      'Commercial Real Estate',
      'Full-service commercial brokerage including office, retail, industrial, and investment properties. We handle sales, leasing, and acquisitions across all commercial property types.',
      'FileText',
    ],
    [
      'Land Sales & Acquisitions',
      'Expert guidance in buying and selling land for residential subdivisions, commercial development, and investment opportunities throughout Utah.',
      'ShoppingBag',
    ],
    [
      'Leasing & Tenant Placement',
      'Comprehensive commercial leasing services including market analysis, property showings, tenant screening, and lease negotiation for landlords and tenants.',
      'Handshake',
    ],
    [
      'New Construction Homes',
      'Build your dream home in one of our developed subdivisions or custom build on a specific lot. We manage the entire process from design to move-in.',
      'Home',
    ],
    [
      'Residential Services',
      "Full residential brokerage services for buyers and sellers. Whether you're purchasing your first home or selling a property, our team provides expert guidance.",
      'Building2',
    ],
  ].map(([title, description, icon], n) => ({
    id: itemId('real-estate.services.items', n),
    title: title ?? 'New service',
    description: description ?? 'Describe the service.',
    icon: icon ?? 'Building2',
  })),
  'real-estate.process.header': heading(
    'Our Process',
    'Your Path to Success',
    'A clear, collaborative approach keeps your priorities at the center of every decision.',
  ),
  'real-estate.process.steps': [
    ['Discovery & Consultation', 'We begin by understanding your goals, timeline, and budget.'],
    ['Market Analysis', 'We evaluate the market and identify opportunities.'],
    ['Negotiation & Transaction', 'We negotiate the best terms and guide every detail.'],
    ['Closing & Transfer', 'We coordinate a smooth transfer of ownership.'],
    ['Ongoing Support', 'We remain a resource after closing.'],
  ].map(([title, description], n) => ({
    id: itemId('real-estate.process.steps', n),
    number: String(n + 1).padStart(2, '0'),
    title: title ?? 'New step',
    description: description ?? 'Describe this step.',
  })),
  'real-estate.about': {
    brandLabel: 'TriCo',
    eyebrow: 'About TriCo Real Estate',
    heading: 'Building Relationships, Delivering Results',
    introduction:
      'TriCo Real Estate is a full-service brokerage specializing in commercial real estate and land while also serving residential clients.',
    detail:
      'For over four decades, we have helped Utah clients navigate the property market with confidence.',
    statValue: '$500M+',
    statLabel: 'In Transactions',
    actionLabel: 'Let’s Talk Real Estate',
  },
  'real-estate.about.features': [
    '40+ Years of Local Expertise',
    'Commercial & Investment Properties',
    'Land Sales & Development',
    'New Home Construction',
    'Expert Negotiation Skills',
    'Proven Track Record',
  ].map((label, n) => ({ id: itemId('real-estate.about.features', n), label })),
  'real-estate.team.header': {
    ...heading(
      'Our Team',
      'Meet Our Real Estate Experts',
      'Experienced professionals dedicated to exceptional results across Utah real estate.',
    ),
    leadershipLabel: 'Leadership',
    staffLabel: 'Our Team',
    agentsLabel: 'Our Agents',
  },
  'real-estate.team.leadership': [
    ['Stephen Tripp', 'Managing Broker', 'steve-tripp.png'],
    ['Randy Rimmer', 'Vice President', 'randy-rimmer.png'],
    ['Brooke Moore', 'Director of Real Estate', 'brooke-moore.jpeg'],
  ].map(([name, role, image], n) => ({
    id: itemId('real-estate.team.leadership', n),
    name: name ?? 'New team member',
    role: role ?? 'Role',
    bio: 'Dedicated to expert guidance and exceptional client service.',
    email: 'realestate@tricoinc.com',
    phone: '(801) 571-8833',
    image: managed(`media/seed/${image ?? 'placeholder-neutral.svg'}`),
    imageAltText: name ?? 'Team member portrait',
  })),
  'real-estate.team.staff': [
    {
      id: itemId('real-estate.team.staff', 0),
      name: 'Mia Barlow',
      role: 'Transaction Coordinator',
      bio: 'Ensures every transaction runs smoothly from contract to close.',
      email: 'mia@tricoinc.com',
      phone: '(801) 571-8833',
      image: managed('media/seed/mia-barlow-re.png'),
      imageAltText: 'Mia Barlow',
    },
  ],
  'real-estate.team.agents': [
    'Michael Thornton',
    'Ben Beesley',
    'Shauna Ayers',
    'Robert Ayers',
    'Stacie Papanikolas',
  ].map((name, n) => ({
    id: itemId('real-estate.team.agents', n),
    name,
    role: 'Licensed Real Estate Agent',
    bio: 'Client-focused service backed by strong local market knowledge.',
    email: 'realestate@tricoinc.com',
    phone: '(801) 571-8833',
    image: managed(
      `media/seed/${n === 0 ? 'michael-thornton.jpg' : n === 1 ? 'ben-beesley.jpg' : 'placeholder-neutral.svg'}`,
    ),
    imageAltText: name,
  })),
  'real-estate.careers': {
    eyebrow: 'Careers',
    heading: 'Join Our Growing Team',
    description:
      'Take your real estate career to the next level with a company known for integrity and mentoring.',
    benefits: [
      { id: itemId('real-estate.careers', 0), label: 'Competitive commission structure' },
      { id: itemId('real-estate.careers', 1), label: 'Comprehensive training and mentorship' },
      { id: itemId('real-estate.careers', 2), label: 'Access to exclusive listings and leads' },
    ],
    actionLabel: 'Apply Now',
    email: 'apply@tricoinc.com',
    cardHeading: 'Ready to Build Your Future?',
    cardDescription: 'Send your resume and cover letter to join Utah’s premier real estate team.',
  },
  'real-estate.testimonials.header': heading(
    'Client Success Stories',
    'Trusted by Property Owners & Investors',
    'Our clients’ success is our greatest achievement.',
  ),
  'real-estate.testimonials.items': [
    [
      'Michael Anderson',
      'Commercial Investor',
      'TriCo’s expertise and market knowledge are invaluable.',
    ],
    ['Sarah Thompson', 'First-Time Homebuyer', 'TriCo made everything simple and stress-free.'],
    ['David Mitchell', 'Land Developer', 'Their market understanding has been instrumental.'],
  ].map(([name, role, quote], n) => ({
    id: itemId('real-estate.testimonials.items', n),
    name: name ?? 'Client',
    role: role ?? 'Client',
    quote: quote ?? 'Client feedback.',
    rating: 5,
  })),
  'real-estate.faq.header': heading(
    'FAQ',
    'Common Questions',
    'Answers to frequently asked questions about our services and process.',
  ),
  'real-estate.faq.items': [
    'What areas does TriCo Real Estate serve?',
    'How does TriCo approach property listings?',
    'What types of commercial properties do you handle?',
    'Can TriCo help with land development projects?',
    'What sets TriCo apart?',
    'How do I get started?',
  ].map((question, n) => ({
    id: itemId('real-estate.faq.items', n),
    question,
    answer:
      'Our experienced team will discuss your needs and create a strategy around your goals and timeline.',
  })),
  'real-estate.reviews.header': heading(
    'We’d Love Your Feedback',
    'Leave Us a Review',
    'Your feedback helps others discover the TriCo difference.',
  ),
  'real-estate.reviews.platforms': ['Google', 'Facebook', 'Yelp'].map((name, n) => ({
    id: itemId('real-estate.reviews.platforms', n),
    name,
    description: 'Share your experience and help others make an informed decision.',
    externalUrl: '',
  })),
  'real-estate.reviews.footer': {
    message: 'Prefer to share feedback privately?',
    email: 'Office@tricoinc.com',
  },
  'real-estate.contact.header': heading(
    'Contact Us',
    'Let’s Discuss Your Real Estate Goals',
    'Whether you’re looking to buy, sell, lease, or develop property, our team is ready to help.',
  ),
  'real-estate.contact.details': {
    addressLabel: 'Office Location',
    address: '194 West 12650 South Suite 200\nDraper, UT 84020',
    phoneLabel: 'Phone',
    phone: '(801) 571-8833',
    faxLabel: 'Fax',
    fax: '(801) 571-9888',
    emailLabel: 'Email',
    email: 'realestate@tricoinc.com',
    officeHoursLabel: 'Office Hours',
    officeHours: 'Monday – Friday: 8am – 4pm',
  },
  'real-estate.footer.brand': {
    logo: managed('media/seed/trico-logo.png'),
    logoAltText: 'TriCo Real Estate',
    description:
      'Utah’s trusted partner for residential and commercial real estate, land acquisition, and property development for over 40 years.',
    address: '194 W 12650 S Suite 200, Draper, UT 84020',
    phone: '(801) 571-8833',
    email: 'realestate@tricoinc.com',
  },
  'real-estate.footer.links': [
    'Listing Services',
    'Commercial Real Estate',
    'Land Development',
    'Our Process',
    'About Us',
    'FAQ',
    'Contact',
  ].map((label, n) => ({
    id: itemId('real-estate.footer.links', n),
    label,
    destination:
      (['services', 'services', 'services', 'process', 'about', 'faq', 'contact'] as const)[n] ??
      'services',
  })),
  'real-estate.footer.license': {
    heading: 'Brokerage License',
    license: 'REALTOR® License# 5472329-CN00',
  },
  'real-estate.footer.legal': {
    organizationName: 'TriCo Real Estate',
    rightsNotice: 'All rights reserved.',
  },
} as const;
export type RealEstateEntityId = keyof typeof realEstateV2SeedData;
