export const pageIds = [
  'home',
  'property-management',
  'real-estate',
  'construction',
  'storage',
  'development',
] as const;

export type PageId = (typeof pageIds)[number];

export interface ContentCard {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly meta?: string;
  readonly href?: string;
}

export interface ContentSection {
  readonly entityId: string;
  readonly anchor: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly cards?: readonly ContentCard[];
  readonly emptyMessage?: string;
}

export interface PageContent {
  readonly pageId: PageId;
  readonly division: string;
  readonly logo: string;
  readonly heroImage?: string;
  readonly hero: {
    readonly entityId: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly primaryAction: string;
    readonly primaryHref: string;
  };
  readonly sections: readonly ContentSection[];
  readonly contact: {
    readonly entityId: string;
    readonly title: string;
    readonly description: string;
    readonly phone: string;
    readonly email: string;
  };
}

const card = (id: string, title: string, description: string, meta?: string): ContentCard => ({
  id,
  title,
  description,
  ...(meta === undefined ? {} : { meta }),
});

export const defaultPages: Readonly<Record<PageId, PageContent>> = {
  home: {
    pageId: 'home',
    division: 'TriCo, Inc.',
    logo: '/assets/images/trico-logo.png',
    hero: {
      entityId: 'home.hero',
      eyebrow: 'A family legacy since 1927',
      title: "Building Utah's Future",
      description:
        'For over four decades, TriCo has helped communities grow through property management, real estate, construction, storage, and development.',
      primaryAction: 'Explore our companies',
      primaryHref: '#divisions',
    },
    sections: [
      {
        entityId: 'home.divisions.items',
        anchor: 'divisions',
        eyebrow: 'One trusted family of companies',
        title: 'Our divisions',
        description: 'Specialists in every stage of owning, improving, and developing property.',
        cards: [
          {
            ...card(
              'real-estate',
              'Real Estate',
              'Buying, selling, and leasing residential and commercial properties.',
            ),
            href: '/real-estate',
          },
          {
            ...card(
              'property-management',
              'Property Management',
              'Commercial and residential management backed by decades of experience.',
            ),
            href: '/property-management',
          },
          {
            ...card(
              'construction',
              'Construction',
              'Quality commercial and residential construction across the Mountain West.',
            ),
            href: '/construction',
          },
          {
            ...card(
              'storage',
              'Storage Management',
              'Secure, convenient storage solutions for personal and business needs.',
            ),
            href: '/storage',
          },
          {
            ...card(
              'development',
              'Development',
              'Land acquisition and residential and commercial development.',
            ),
            href: '/development',
          },
        ],
      },
      {
        entityId: 'home.core-values.items',
        anchor: 'values',
        eyebrow: 'How we work',
        title: 'Our core values',
        cards: [
          card('integrity', 'Integrity', 'We conduct business with honesty and transparency.'),
          card('excellence', 'Excellence', 'We hold ourselves to the highest standards.'),
          card('community', 'Community', "We invest in the places we're proud to call home."),
          card(
            'teamwork',
            'Teamwork',
            'We collaborate across divisions to deliver exceptional results.',
          ),
        ],
      },
      {
        entityId: 'home.journey.timeline',
        anchor: 'journey',
        eyebrow: 'Three generations strong',
        title: 'Our journey',
        cards: [
          card('1927', '1927', 'Francis Earl Tripp founded Tripp Construction in Utah.'),
          card('1987', '1987', 'The company became TriCo Construction and expanded its services.'),
          card('2016', '2016', 'Storage management joined the TriCo family.'),
          card('today', 'Today', 'TriCo serves clients across Utah, Idaho, and Arizona.'),
        ],
      },
    ],
    contact: {
      entityId: 'home.contact',
      title: 'Start a conversation',
      description: 'Tell us what you are building, buying, managing, or developing.',
      phone: '(801) 572-9000',
      email: 'info@tricoinc.com',
    },
  },
  'property-management': {
    pageId: 'property-management',
    division: 'Property Management',
    logo: '/assets/images/property-management-logo.png',
    hero: {
      entityId: 'property-management.hero',
      eyebrow: 'Trusted since 1985',
      title: 'Property management that performs',
      description:
        'Responsive residential and commercial management built around owners, tenants, and long-term value.',
      primaryAction: 'Request a consultation',
      primaryHref: '#contact',
    },
    sections: [
      {
        entityId: 'property-management.services.items',
        anchor: 'services',
        eyebrow: 'Full-service management',
        title: 'Services for every property',
        cards: [
          card(
            'commercial',
            'Commercial management',
            'Leasing, tenant relations, reporting, and property operations.',
          ),
          card(
            'residential',
            'Residential management',
            'Thoughtful service for owners and residents.',
          ),
          card(
            'maintenance',
            'Maintenance coordination',
            'Reliable vendor coordination and preventative care.',
          ),
          card('accounting', 'Financial reporting', 'Clear reporting that keeps owners informed.'),
        ],
      },
      {
        entityId: 'property-management.process.steps',
        anchor: 'process',
        eyebrow: 'A clear approach',
        title: 'Our management process',
        cards: [
          card('discover', 'Discover', 'We learn the property and your goals.'),
          card('plan', 'Plan', 'We build a practical operating plan.'),
          card('operate', 'Operate', 'Our team handles the details.'),
          card('report', 'Report', 'You receive clear updates and results.'),
        ],
      },
      {
        entityId: 'property-management.portfolio.managed.items',
        anchor: 'properties',
        eyebrow: 'Managed with care',
        title: 'Featured properties',
        cards: [
          card('arbor-plaza', 'Arbor Plaza', 'Professionally managed commercial property.'),
          card('country-square', 'Country Square', 'A welcoming neighborhood retail destination.'),
          card(
            'laurel-square',
            'Laurel Square',
            'Responsive management for tenants and ownership.',
          ),
        ],
      },
      {
        entityId: 'property-management.tenant-portal.features',
        anchor: 'tenant-portal',
        eyebrow: 'For current tenants',
        title: 'Tenant portal',
        description: 'Access payments, documents, and service requests through Rent Manager.',
        cards: [
          {
            ...card('portal', 'Open tenant portal', 'Securely manage your account online.'),
            href: 'https://tricopm.managebuilding.com/',
          },
        ],
      },
    ],
    contact: {
      entityId: 'property-management.contact.details',
      title: 'Put your property in capable hands',
      description: 'Talk with our team about your management needs.',
      phone: '(801) 572-9000',
      email: 'propertymanagement@tricoinc.com',
    },
  },
  'real-estate': {
    pageId: 'real-estate',
    division: 'Real Estate',
    logo: '/assets/images/real-estate-logo.png',
    heroImage: '/assets/images/real-estate-hero.jpg',
    hero: {
      entityId: 'real-estate.hero',
      eyebrow: 'Local knowledge. Proven results.',
      title: 'Find the right place for what comes next',
      description:
        'Experienced representation for commercial and residential buyers, sellers, owners, and tenants.',
      primaryAction: 'View listings',
      primaryHref: '#listings',
    },
    sections: [
      {
        entityId: 'real-estate.listings.items',
        anchor: 'listings',
        eyebrow: 'Current opportunities',
        title: 'Featured listings',
        description: 'A selection of properties represented by our team.',
        cards: [
          card(
            'slc-commercial',
            'Salt Lake City Commercial',
            'Flexible commercial space in a connected location.',
            'Commercial',
          ),
          card(
            'whisper-hollow-105',
            'Whisper Hollow Lot 105',
            'New residential opportunity in a growing community.',
            'Residential',
          ),
          card(
            'boxwood',
            'Boxwood Drive',
            'Thoughtfully designed home with generous living spaces.',
            'Residential',
          ),
        ],
      },
      {
        entityId: 'real-estate.services.items',
        anchor: 'services',
        eyebrow: 'End-to-end guidance',
        title: 'Real estate services',
        cards: [
          card('buy', 'Buyer representation', 'Find and evaluate the right property.'),
          card('sell', 'Seller representation', 'Position your property for a successful sale.'),
          card('lease', 'Leasing', 'Connect owners and tenants with aligned goals.'),
          card(
            'investment',
            'Investment advisory',
            'Make informed decisions with local market insight.',
          ),
        ],
      },
      {
        entityId: 'real-estate.process.steps',
        anchor: 'process',
        eyebrow: 'Built around you',
        title: 'A straightforward process',
        cards: [
          card('goals', 'Understand your goals', 'We start by listening.'),
          card('market', 'Navigate the market', 'We identify and evaluate opportunities.'),
          card('close', 'Move with confidence', 'We guide the details through closing.'),
        ],
      },
    ],
    contact: {
      entityId: 'real-estate.contact.details',
      title: 'Make your next move',
      description: 'Connect with a TriCo real estate professional.',
      phone: '(801) 572-9000',
      email: 'realestate@tricoinc.com',
    },
  },
  construction: {
    pageId: 'construction',
    division: 'Construction',
    logo: '/assets/images/trico-logo.png',
    heroImage: '/assets/images/construction-hero.jpg',
    hero: {
      entityId: 'construction.hero',
      eyebrow: 'Built on generations of experience',
      title: 'Construction with purpose',
      description:
        'From preconstruction through closeout, our team delivers durable work and dependable partnership.',
      primaryAction: 'Plan your project',
      primaryHref: '#contact',
    },
    sections: [
      {
        entityId: 'construction.services.items',
        anchor: 'services',
        eyebrow: 'How we build',
        title: 'Construction services',
        cards: [
          card(
            'general',
            'General contracting',
            'Accountable leadership from mobilization to completion.',
          ),
          card(
            'design-build',
            'Design-build',
            'One collaborative team from concept through construction.',
          ),
          card(
            'preconstruction',
            'Preconstruction',
            'Early estimating, scheduling, and constructability guidance.',
          ),
          card('tenant', 'Tenant improvements', 'Spaces tailored for the people who use them.'),
        ],
      },
      {
        entityId: 'construction.current-projects.header',
        anchor: 'projects',
        eyebrow: 'Our work',
        title: 'Current projects',
        description: 'Explore project categories and published work.',
        cards: [
          {
            ...card('multi-family', 'Multi-family', 'Apartments, townhomes, and communities.'),
            href: '/construction/current/multi-family',
          },
          {
            ...card('retail', 'Retail', 'Customer-focused retail environments.'),
            href: '/construction/current/retail',
          },
          {
            ...card(
              'office-ti',
              'Office & tenant improvement',
              'Productive, thoughtful workplaces.',
            ),
            href: '/construction/current/office-ti',
          },
          {
            ...card('industrial', 'Industrial', 'Durable facilities designed for operations.'),
            href: '/construction/current/industrial',
          },
        ],
      },
      {
        entityId: 'construction.plan-room.plan-sets',
        anchor: 'plan-room',
        eyebrow: 'Trade partners',
        title: 'Plan room',
        description: 'Access current bid opportunities and project documents.',
        cards: [
          card(
            'access',
            'Request plan access',
            'Contact our estimating team to request credentials.',
          ),
        ],
      },
    ],
    contact: {
      entityId: 'construction.contact.details',
      title: 'Build with TriCo',
      description: 'Bring us your plans, goals, and questions.',
      phone: '(801) 572-9000',
      email: 'construction@tricoinc.com',
    },
  },
  storage: {
    pageId: 'storage',
    division: 'Storage Management',
    logo: '/assets/images/storage-logo.png',
    heroImage: '/assets/images/storage-hero.png',
    hero: {
      entityId: 'storage.hero',
      eyebrow: 'Space when you need it',
      title: 'Storage made simple',
      description:
        'Convenient, professionally managed storage solutions for households and businesses.',
      primaryAction: 'Explore features',
      primaryHref: '#features',
    },
    sections: [
      {
        entityId: 'storage.services.items',
        anchor: 'features',
        eyebrow: 'Simple and secure',
        title: 'Storage features',
        cards: [
          card('secure', 'Secure facilities', 'Thoughtful access and property oversight.'),
          card(
            'sizes',
            'Flexible unit sizes',
            'Options for small keepsakes or business inventory.',
          ),
          card(
            'access',
            'Convenient access',
            'Locations and access designed around busy schedules.',
          ),
          card('service', 'Responsive service', 'A local team ready to help.'),
        ],
      },
      {
        entityId: 'storage.team.members',
        anchor: 'team',
        eyebrow: 'People who care',
        title: 'Our storage team',
        description: 'Friendly local support for every stage of your rental.',
      },
      {
        entityId: 'storage.about',
        anchor: 'about',
        eyebrow: 'Part of the TriCo family',
        title: 'Professionally managed storage',
        description:
          'We bring the same care, integrity, and operational discipline to storage that have guided TriCo for generations.',
      },
    ],
    contact: {
      entityId: 'storage.contact.details',
      title: 'Find your space',
      description: 'Ask about availability, unit sizes, and locations.',
      phone: '(801) 572-9000',
      email: 'storage@tricoinc.com',
    },
  },
  development: {
    pageId: 'development',
    division: 'Development',
    logo: '/assets/images/trico-logo.png',
    heroImage: '/assets/images/development-hero.jpg',
    hero: {
      entityId: 'development.hero',
      eyebrow: 'From land to lasting community',
      title: 'Development with a long view',
      description:
        'Land acquisition, entitlement, planning, and development informed by regional experience.',
      primaryAction: 'Discuss an opportunity',
      primaryHref: '#contact',
    },
    sections: [
      {
        entityId: 'development.land-experts.services',
        anchor: 'land',
        eyebrow: 'Land expertise',
        title: 'Experience at every stage',
        cards: [
          card('acquisition', 'Land acquisition', 'Identify and evaluate opportunities.'),
          card('entitlement', 'Entitlement', 'Navigate complex approval processes.'),
          card('planning', 'Planning', 'Shape practical, enduring places.'),
        ],
      },
      {
        entityId: 'development.services.items',
        anchor: 'services',
        eyebrow: 'Integrated capabilities',
        title: 'Development services',
        cards: [
          card('residential', 'Residential communities', 'Places designed for how people live.'),
          card(
            'commercial',
            'Commercial development',
            'Sites that support businesses and communities.',
          ),
          card(
            'mixed-use',
            'Mixed-use planning',
            'Connected destinations with complementary uses.',
          ),
          card('delivery', 'Project delivery', 'Coordinated execution from vision to completion.'),
        ],
      },
      {
        entityId: 'development.projects.featured',
        anchor: 'projects',
        eyebrow: 'Selected work',
        title: 'Featured developments',
        cards: [
          card(
            'whisper-hollow',
            'Whisper Hollow',
            'A residential community shaped around quality homes and lasting value.',
          ),
          card(
            'regional',
            'Regional partnerships',
            'Opportunities across Utah, Idaho, and Arizona.',
          ),
        ],
      },
    ],
    contact: {
      entityId: 'development.contact.details',
      title: 'Bring the opportunity into focus',
      description: 'Start a conversation with our development team.',
      phone: '(801) 572-9000',
      email: 'development@tricoinc.com',
    },
  },
};

export const constructionCategories = [
  'multi-family',
  'retail',
  'office-ti',
  'medical-dental',
  'industrial',
  'storage',
  'subdivisions',
  'underground',
] as const;
