const managed = (key: string) => ({ kind: 'managed' as const, key });
const external = (url: string) => ({ kind: 'external' as const, url });
type ListingSeedImage = ReturnType<typeof managed> | ReturnType<typeof external>;
type ListingSeedRow = readonly [
  address: string,
  city: string,
  price: string,
  detail: string,
  type: string,
  status: 'active' | 'sold',
  image: ListingSeedImage,
  mlsNumber: string,
  externalUrl: string,
];
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
    'Browse our current commercial properties, land listings, and recently completed transactions across Utah.',
  ),
  'real-estate.listings.items': (
    [
      [
        '1457 N Whisper Hollow Cir',
        'Lehi, UT',
        '$512,000',
        '0.56 Acres',
        'Land',
        'active',
        managed('media/seed/whisper-hollow-lot-119.jpg'),
        '2019235',
        'https://www.utahrealestate.com/2019235',
      ],
      [
        '1604 W Box Wood Dr',
        'Lehi, UT',
        '$521,000',
        '0.46 Acres',
        'Land',
        'active',
        managed('media/seed/whisper-hollow-lot-boxwood.jpg'),
        '2019250',
        'https://www.utahrealestate.com/2019250',
      ],
      [
        '1405 N Whisper Hollow Cir',
        'Lehi, UT',
        '$559,000',
        '0.83 Acres',
        'Land',
        'active',
        managed('media/seed/whisper-hollow-lot-105.jpg'),
        '2019286',
        'https://www.utahrealestate.com/2019286',
      ],
      [
        '9853 S 700 E',
        'Sandy, UT',
        'Contact for details',
        'Commercial property',
        'Commercial',
        'active',
        external(
          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop',
        ),
        '',
        'https://www.loopnet.com/Listing/9853-S-700-E-Sandy-UT/37111521/',
      ],
      [
        '2560 E 3300 S',
        'Salt Lake City, UT',
        'Contact for details',
        'Commercial property',
        'Commercial',
        'active',
        external(
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
        ),
        '',
        'https://www.loopnet.com/Listing/2560-E-3300-S-Salt-Lake-City-UT/39291246/',
      ],
      [
        'LOT 110 — Boxwood Dr',
        'Lehi, UT',
        'Whisper Hollow Estates',
        'New Construction',
        'Residential',
        'sold',
        managed('media/seed/boxwood-dr-exterior.jpg'),
        '',
        '',
      ],
      [
        '2200 State St',
        'South Jordan, UT',
        '$3,250,000',
        '22,000 sqft',
        'Commercial Office',
        'sold',
        external(
          'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
        ),
        '',
        '',
      ],
      [
        'Lot 5–8, Cedar Hills',
        'Cedar Hills, UT',
        '$1,650,000',
        '12 Acres',
        'Land',
        'sold',
        external(
          'https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=600&h=400&fit=crop',
        ),
        '',
        '',
      ],
      [
        'LOT 109 — Boxwood Dr',
        'Lehi, UT',
        'Whisper Hollow Estates',
        'New Construction',
        'Residential',
        'sold',
        managed('media/seed/whisper-hollow-lot-boxwood.jpg'),
        '',
        '',
      ],
      [
        '750 Technology Way',
        'Orem, UT',
        '$4,350,000',
        '30,000 sqft',
        'Industrial',
        'sold',
        external(
          'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop',
        ),
        '',
        '',
      ],
    ] satisfies readonly ListingSeedRow[]
  ).map(([address, city, price, detail, type, status, image, mlsNumber, externalUrl], n) => ({
    id: itemId('real-estate.listings.items', n),
    address: address ?? 'New listing',
    city: city ?? 'Draper, UT',
    price: price ?? 'Contact for details',
    mlsNumber: mlsNumber ?? '',
    detail: detail ?? 'Property details',
    type: type ?? 'Property',
    status: status === 'active' ? ('active' as const) : ('sold' as const),
    image: image ?? managed('media/seed/placeholder-neutral.svg'),
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
    actionLabel: status === 'active' ? (mlsNumber ? 'View on MLS' : 'View on LoopNet') : '',
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
    'TriCo Real Estate is a full-service brokerage specializing in commercial real estate and land, with expertise in new construction and residential services. Whatever your real estate needs, we deliver results.',
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
    'Our proven process ensures a seamless experience from initial consultation to closing and beyond.',
  ),
  'real-estate.process.steps': [
    [
      'Discovery & Consultation',
      'We begin by understanding your goals, timeline, and budget to create a customized strategy that aligns with your real estate objectives.',
    ],
    [
      'Market Analysis',
      'Our team conducts thorough market research and property evaluations to identify opportunities and ensure informed decision-making.',
    ],
    [
      'Negotiation & Transaction',
      'Leveraging decades of experience, we negotiate the best terms and guide you through every step of the transaction process.',
    ],
    [
      'Closing & Transfer',
      'We coordinate all closing details, ensuring a smooth transfer of ownership with attention to every legal and financial requirement.',
    ],
    [
      'Ongoing Support',
      "Our relationship doesn't end at closing. We provide continued support, market updates, and guidance for your future real estate needs.",
    ],
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
      "TriCo Real Estate is a full-service brokerage specializing in commercial real estate and land, while also serving residential clients. For over four decades, we've helped investors, businesses, homeowners, and developers navigate Utah's property market with confidence.",
    detail:
      'From commercial sales and leasing to land acquisitions, new construction homes in our subdivisions or custom builds on your lot, and traditional residential transactions — our experienced team delivers results across every property type.',
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
      'Experienced professionals dedicated to delivering exceptional results across every aspect of Utah real estate.',
    ),
    leadershipLabel: 'Leadership',
    staffLabel: 'Our Team',
    agentsLabel: 'Our Agents',
  },
  'real-estate.team.leadership': [
    {
      id: itemId('real-estate.team.leadership', 0),
      name: 'Stephen Tripp',
      role: 'Managing Broker',
      bio: 'With over 30 years of experience in Utah real estate, Steve brings unmatched expertise in residential and commercial transactions. As Managing Broker, he oversees all brokerage operations to deliver exceptional results for every client.',
      email: 'stephenjr@tricoinc.com',
      phone: '(801) 571-8833',
      image: managed('media/seed/steve-tripp.png'),
      imageAltText: 'Stephen Tripp',
    },
    {
      id: itemId('real-estate.team.leadership', 1),
      name: 'Randy Rimmer',
      role: 'Vice President',
      bio: 'Dedicated to providing exceptional service and expertise for all your real estate needs.',
      email: 'Randy@tricoinc.com',
      phone: '(801) 571-8833',
      image: managed('media/seed/randy-rimmer.png'),
      imageAltText: 'Randy Rimmer',
    },
    {
      id: itemId('real-estate.team.leadership', 2),
      name: 'Brooke Moore',
      role: 'Director of Real Estate',
      bio: 'With extensive experience in both real estate transactions and land development, Brooke leads our real estate division with a passion for helping clients achieve their property goals. She is dedicated to educating and leading agents to success.',
      email: 'brooke@tricoinc.com',
      phone: '(808) 292-4634',
      image: managed('media/seed/brooke-moore.jpeg'),
      imageAltText: 'Brooke Moore',
    },
  ],
  'real-estate.team.staff': [
    {
      id: itemId('real-estate.team.staff', 0),
      name: 'Mia Barlow',
      role: 'Transaction Coordinator',
      bio: 'Mia ensures every transaction runs smoothly from contract to close, bringing a detail-oriented approach and exceptional organizational skills to support our agents and clients.',
      email: 'mia@tricoinc.com',
      phone: '(801) 571-8833',
      image: managed('media/seed/mia-barlow-re.png'),
      imageAltText: 'Mia Barlow',
    },
  ],
  'real-estate.team.agents': [
    [
      'Michael Thornton',
      'Michael brings a client-focused approach to real estate, ensuring every transaction is handled with professionalism and care.',
      'michael@tricoinc.com',
      'michael-thornton.jpg',
    ],
    [
      'Ben Beesley',
      'Ben is dedicated to helping clients buy and sell with confidence, bringing a client-first approach and strong local market knowledge to every transaction.',
      'ben@tricoinc.com',
      'ben-beesley.jpg',
    ],
    [
      'Shauna Ayers',
      'Shauna brings a warm, client-first approach to real estate, helping buyers and sellers navigate every transaction with confidence and care.',
      'shauna@tricoinc.com',
      'shauna-thomas.png',
    ],
    [
      'Robert Ayers',
      'Robert brings strong local market knowledge and a client-first approach, helping buyers and sellers achieve their real estate goals with confidence.',
      'robert@tricoinc.com',
      'robert-ayers.png',
    ],
    [
      'Stacie Papanikolas',
      'Stacie brings a warm, detail-oriented approach to real estate, guiding clients through every step of buying or selling with care and local expertise.',
      'stacie@tricoinc.com',
      'stacie-papanikolas.jpg',
    ],
  ].map(([name, bio, email, image], n) => ({
    id: itemId('real-estate.team.agents', n),
    name: name ?? 'New agent',
    role: 'Licensed Real Estate Agent',
    bio: bio ?? 'Agent biography.',
    email: email ?? 'realestate@tricoinc.com',
    phone: '(801) 571-8833',
    image: managed(`media/seed/${image ?? 'placeholder-neutral.svg'}`),
    imageAltText: name ?? 'Agent portrait',
  })),
  'real-estate.careers': {
    eyebrow: 'Careers',
    heading: 'Join Our Growing Team',
    description:
      'Are you a motivated real estate professional looking to take your career to the next level? TriCo Real Estate is seeking talented agents who share our commitment to excellence and client satisfaction.',
    benefits: [
      { id: itemId('real-estate.careers', 0), label: 'Competitive commission structure' },
      { id: itemId('real-estate.careers', 1), label: 'Comprehensive training and mentorship' },
      { id: itemId('real-estate.careers', 2), label: 'Access to exclusive listings and leads' },
      { id: itemId('real-estate.careers', 3), label: '40+ years of market reputation' },
    ],
    actionLabel: 'Apply Now',
    email: 'apply@tricoinc.com',
    cardHeading: 'Ready to Build Your Future?',
    cardDescription: 'Send your resume and cover letter to join Utah’s premier real estate team.',
  },
  'real-estate.testimonials.header': heading(
    'Client Success Stories',
    'Trusted by Property Owners & Investors',
    "Our clients' success is our greatest achievement. Here's what they have to say about working with TriCo Real Estate.",
  ),
  'real-estate.testimonials.items': [
    [
      'Michael Anderson',
      'Commercial Investor',
      "TriCo's expertise in commercial real estate is unmatched. They helped us identify and acquire a retail property that exceeded our investment expectations. Their market knowledge is invaluable.",
    ],
    [
      'Sarah Thompson',
      'First-Time Homebuyer',
      'As a first-time buyer, I was nervous about the process. TriCo made everything simple and stress-free. They found us the perfect home within our budget and timeline.',
    ],
    [
      'David Mitchell',
      'Land Developer',
      "We've partnered with TriCo on multiple development projects. Their understanding of zoning, entitlements, and market dynamics has been instrumental in our success.",
    ],
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
    'Find answers to frequently asked questions about our real estate services and process.',
  ),
  'real-estate.faq.items': [
    [
      'What areas does TriCo Real Estate serve?',
      'TriCo Real Estate primarily serves the greater Salt Lake City area, including Utah County, Davis County, and Summit County. We also handle select properties throughout Utah and have expanded into Arizona and Idaho markets.',
    ],
    [
      'How does TriCo approach property listings?',
      'We create customized marketing strategies for each property, including professional photography, virtual tours, targeted digital advertising, and leveraging our extensive network of buyers and investors. Our goal is maximum exposure to qualified buyers.',
    ],
    [
      'What types of commercial properties do you handle?',
      'We specialize in all commercial property types including office buildings, retail centers, industrial facilities, multi-family apartments, and mixed-use developments. Our team has deep experience in each sector.',
    ],
    [
      'Can TriCo help with land development projects?',
      "Absolutely. We offer comprehensive land development services from site selection and due diligence through entitlement, construction coordination, and sales. We've successfully completed numerous residential and commercial development projects.",
    ],
    [
      'What sets TriCo apart from other real estate firms?',
      'With 40+ years of local experience, we combine deep market knowledge with personalized service. Our integrated approach—offering real estate, property management, and construction under one roof—provides unique value to our clients.',
    ],
    [
      'How do I get started with TriCo Real Estate?',
      "Simply contact us for a free consultation. We'll discuss your goals, timeline, and requirements to create a customized strategy. Whether you're buying, selling, leasing, or developing, we're here to guide you through the process.",
    ],
  ].map(([question, answer], n) => ({
    id: itemId('real-estate.faq.items', n),
    question: question ?? 'New question',
    answer: answer ?? 'Add an answer.',
  })),
  'real-estate.reviews.header': heading(
    'We’d Love Your Feedback',
    'Leave Us a Review',
    'Your feedback helps us grow and lets others discover the TriCo difference. It only takes a minute — pick your favorite platform below.',
  ),
  'real-estate.reviews.platforms': [
    ['Google', 'Share your experience on Google Reviews — helps neighbors find us.'],
    ['Facebook', 'Recommend us on Facebook so your network can see it too.'],
    ['Yelp', 'Leave a Yelp review to help others make an informed decision.'],
  ].map(([name, description], n) => ({
    id: itemId('real-estate.reviews.platforms', n),
    name: name ?? 'Review platform',
    description: description ?? 'Share your experience.',
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
