import type { EditableValue } from '../schemas/content.js';
import { constructionCategoryIds, constructionProjectStatuses } from '../schemas/construction.js';

const LIST_ITEM_MIGRATION_NAMESPACE = 'c63b8c48-2f88-5a33-9b55-f5430eb6764a';
const idGroups = [
  ['construction.header', 1, 8],
  ['construction.hero.stats', 9, 11],
  ['construction.services.items', 12, 17],
  ['construction.plan-room.plan-sets', 18, 21],
  ['construction.pros.items', 22, 27],
  ['construction.pros.stats', 28, 31],
  ['construction.team.members', 32, 34],
  ['construction.about.features', 35, 40],
  ['construction.careers.benefits', 41, 43],
  ['construction.careers.open-positions', 44, 48],
  ['construction.reviews.platforms', 49, 51],
  ['construction.footer.links', 52, 58],
  ['construction.footer.licenses', 59, 61],
] as const;
function fnv1a(value: string, seed: number): number {
  let hash = seed >>> 0;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}
function uid(number: number): string {
  const group = idGroups.find(([, first, last]) => number >= first && number <= last);
  if (group === undefined) throw new Error(`Unknown Construction seed identity ${number}`);
  const [entityId, first] = group;
  const input = `${LIST_ITEM_MIGRATION_NAMESPACE}:${entityId}:${number - first}`;
  const words = [
    fnv1a(input, 2_166_136_261),
    fnv1a(input, 2_166_136_261 ^ 0x9e3779b9),
    fnv1a(input, 2_166_136_261 ^ 0x85ebca6b),
    fnv1a(input, 2_166_136_261 ^ 0xc2b2ae35),
  ];
  const hex = words.map((word) => word.toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
const categories = {
  'multi-family': ['Multi Family', 'Apartments, townhomes, and condominium communities'],
  retail: ['Retail', 'Shopping centers, pads, and tenant spaces'],
  'office-ti': ['Office / TI', 'Ground-up offices and tenant improvement build-outs'],
  'medical-dental': ['Medical / Dental', 'Clinics, dental suites, and specialty facilities'],
  industrial: ['Industrial', 'Warehouse, flex, and manufacturing facilities'],
  storage: ['Storage', 'Self-storage and RV or boat storage facilities'],
  subdivisions: ['Subdivisions', 'Residential subdivisions and final lot delivery'],
  underground: ['Underground', 'Wet and dry utilities, storm drain, sewer, and infrastructure'],
} as const;

const baseSeeds: Readonly<Record<string, EditableValue>> = {
  'construction.anniversary-banner': { message: '40+ Years of Excellence' },
  'construction.header': {
    logo: { kind: 'managed', key: 'media/seed/trico-logo.png' },
    logoAltText: 'TriCo Construction',
    divisionLabel: 'Construction',
    phone: '(801) 571-8833',
    actionLabel: 'Get Quote',
    navLinks: [
      { id: uid(1), label: 'Services', destination: 'services' },
      { id: uid(2), label: 'Projects', destination: 'projects' },
      { id: uid(3), label: 'Plan Room', destination: 'plan-room' },
      { id: uid(4), label: "Our Pro's", destination: 'pros' },
      { id: uid(5), label: 'Our Team', destination: 'team' },
      { id: uid(6), label: 'Get a Bid', destination: 'bid' },
      { id: uid(7), label: 'Careers', destination: 'careers' },
      { id: uid(8), label: 'Contact', destination: 'contact' },
    ],
  },
  'construction.hero': {
    primaryBadge: 'Premier Construction Partner',
    serviceAreaBadge: 'Servicing Utah, Idaho & Arizona',
    heading: 'Building The Future',
    locationHeading: 'in Utah, Idaho & Arizona',
    promise: 'Every Phase. Every Detail. Our Work Matters.',
    description:
      'From concrete foundations to complete commercial builds, TriCo Construction delivers quality craftsmanship and reliable results on every project.',
    primaryActionLabel: 'Get a Quote',
    secondaryActionLabel: 'Our Services',
    image: { kind: 'managed', key: 'media/seed/construction-crew-1.jpg' },
    imageAltText: 'TriCo construction crew standing outdoors',
  },
  'construction.hero.stats': [
    { id: uid(9), icon: 'Clock', value: '40+', label: 'Years Experience' },
    { id: uid(10), icon: 'Building', value: '500+', label: 'Projects Completed' },
    { id: uid(11), icon: 'HardHat', value: '3', label: 'States Served' },
  ],
  'construction.services.header': {
    eyebrow: 'Our Services',
    heading: 'Comprehensive Construction Solutions',
    description:
      'From site preparation to final finishes, TriCo Construction delivers quality craftsmanship across Utah, Arizona, and Idaho.',
  },
  'construction.services.items': [
    {
      id: uid(12),
      icon: 'Boxes',
      title: 'Concrete',
      description:
        'Expert foundations, flatwork, retaining walls, and decorative concrete for residential and commercial projects.',
    },
    {
      id: uid(13),
      icon: 'Building2',
      title: 'Multi-Housing',
      description:
        'Complete multi-family construction from ground-up builds to major apartment, condo, and townhome renovations.',
    },
    {
      id: uid(14),
      icon: 'Shovel',
      title: 'Underground Utilities',
      description:
        'Professional water, sewer, storm drain, and utility infrastructure installation.',
    },
    {
      id: uid(15),
      icon: 'Wrench',
      title: 'Excavation',
      description:
        'Site preparation, grading, trenching, and earthwork for projects of every size.',
    },
    {
      id: uid(16),
      icon: 'Home',
      title: 'Office Construction & Remodels',
      description: 'Commercial offices and tenant improvements tailored to business needs.',
    },
    {
      id: uid(17),
      icon: 'Warehouse',
      title: 'Storage Facilities',
      description:
        'Design-build services for climate-controlled and traditional self-storage facilities.',
    },
  ],
  'construction.current-projects.header': {
    eyebrow: 'Current Projects',
    heading: 'Built Across Every Sector',
    description: 'Select a sector to view our active construction projects.',
    cardActionLabel: 'View projects',
  },
  'construction.completed-projects.header': {
    eyebrow: 'Completed Projects',
    heading: 'Built Across Every Sector',
    description: 'Select a sector to view our completed work.',
    cardActionLabel: 'View projects',
  },
  'construction.plan-room.header': {
    eyebrow: 'Subcontractor Access',
    heading: 'Plan Room',
    description:
      'Current subcontractors can access the latest project plans, drawings, and specifications. Always confirm you are working from the latest set.',
    planListHeading: 'Current Project Plans',
    viewPlansLabel: 'View Plans',
    specificationsLabel: 'Specs',
  },
  'construction.plan-room.access-notice': {
    icon: 'Lock',
    heading: 'Login Required',
    description:
      'Plan access is restricted to approved subcontractors and vendors. Request credentials below.',
  },
  'construction.plan-room.plan-sets': [
    {
      id: uid(18),
      name: 'Draper Mixed-Use Development',
      projectNumber: 'TCC-2026-014',
      lastUpdated: 'Aug 12, 2026',
      sheetCount: 42,
      latestRevision: 'Rev D',
    },
    {
      id: uid(19),
      name: 'Lehi Multi-Housing Phase II',
      projectNumber: 'TCC-2026-011',
      lastUpdated: 'Aug 5, 2026',
      sheetCount: 36,
      latestRevision: 'Rev B',
    },
    {
      id: uid(20),
      name: 'Saratoga Springs Storage Facility',
      projectNumber: 'TCC-2026-009',
      lastUpdated: 'Jul 28, 2026',
      sheetCount: 24,
      latestRevision: 'Rev C',
    },
    {
      id: uid(21),
      name: 'Tucson Commercial Office Build-Out',
      projectNumber: 'TCC-2026-007',
      lastUpdated: 'Jul 19, 2026',
      sheetCount: 31,
      latestRevision: 'Rev A',
    },
  ],
  'construction.plan-room.request-access': {
    heading: 'Need Plan Room Access?',
    description:
      'Subcontractors and vendors can request login credentials to view the latest drawings.',
    actionLabel: 'Request Access',
    email: 'Office@tricoinc.com',
  },
  'construction.pros.header': {
    eyebrow: 'Why Choose TriCo',
    heading: "Our Pro's",
    description:
      'With 40+ years building across the Mountain West, this is what sets TriCo Construction apart.',
  },
  'construction.pros.items': [
    {
      id: uid(22),
      icon: 'HardHat',
      title: 'Experienced Crews',
      description:
        'Decades of combined experience ensure quality workmanship from start to finish.',
    },
    {
      id: uid(23),
      icon: 'Award',
      title: 'Licensed & Insured',
      description: 'Licensed in Utah, Arizona, and Idaho with comprehensive insurance coverage.',
    },
    {
      id: uid(24),
      icon: 'Clock',
      title: 'On-Time Delivery',
      description: 'Disciplined project management keeps construction on schedule.',
    },
    {
      id: uid(25),
      icon: 'Shield',
      title: 'Safety First',
      description: 'Zero-compromise safety protocols protect workers and property.',
    },
    {
      id: uid(26),
      icon: 'Users',
      title: 'Dedicated Project Managers',
      description: 'One point of contact keeps communication clear from bid to completion.',
    },
    {
      id: uid(27),
      icon: 'Wrench',
      title: 'Quality Equipment',
      description: 'Modern, well-maintained equipment supports efficient, high-quality results.',
    },
  ],
  'construction.pros.stats': [
    { id: uid(28), value: '40+', label: 'Years Experience' },
    { id: uid(29), value: '500+', label: 'Projects Completed' },
    { id: uid(30), value: '3', label: 'States Served' },
    { id: uid(31), value: '100%', label: 'Client Focused' },
  ],
  'construction.team.header': {
    eyebrow: 'Our Team',
    heading: 'Our Construction Experts',
    description:
      'Experienced professionals who lead every project with dedication and a commitment to excellence.',
  },
  'construction.team.members': [
    {
      id: uid(32),
      name: 'Randy Rimmer',
      title: 'Vice President',
      email: 'randy@tricoinc.com',
      phone: '(801) 571-8833',
      photo: { kind: 'managed', key: 'media/seed/randy-rimmer.png' },
      photoAltText: 'Randy Rimmer',
    },
    {
      id: uid(33),
      name: 'Katie Thompson',
      title: 'Project Coordinator',
      email: '',
      phone: '',
      photo: { kind: 'managed', key: 'media/seed/katie-thompson.jpg' },
      photoAltText: 'Katie Thompson',
    },
    {
      id: uid(34),
      name: 'Caylie Disney',
      title: 'Equipment Assistant',
      email: '',
      phone: '',
      photo: { kind: 'managed', key: 'media/seed/caylie-disney.jpg' },
      photoAltText: 'Caylie Disney',
    },
  ],
  'construction.workers': {
    eyebrow: 'In the Field',
    heading: 'Our Construction Crew',
    description:
      'The hardworking professionals who bring every project to life with quality craftsmanship.',
    image: { kind: 'managed', key: 'media/seed/construction-crew-2.jpg' },
    imageAltText: 'TriCo construction crew posing with heavy equipment',
  },
  'construction.about': {
    eyebrow: 'About TriCo Construction',
    heading: 'Building & Developing in Utah Since 1984',
    introduction:
      "For over four decades, TriCo Construction has been building Utah's future. Our commitment to quality, safety, and customer satisfaction has made us a trusted partner.",
    detail:
      'From concrete foundations to complete commercial builds, our experienced team delivers exceptional results on every project.',
    brandLabel: 'TriCo',
    brandDescription: 'Construction Excellence',
    statValue: '500+',
    statLabel: 'Projects Completed',
    actionLabel: 'Start Your Project',
  },
  'construction.about.features': [
    { id: uid(35), label: '40+ Years of Construction Excellence' },
    { id: uid(36), label: 'Licensed in Utah, Arizona & Idaho' },
    { id: uid(37), label: 'On-Time Project Delivery' },
    { id: uid(38), label: 'Competitive Pricing' },
    { id: uid(39), label: 'Quality Craftsmanship' },
    { id: uid(40), label: 'Safety First Culture' },
  ],
  'construction.bid.header': {
    eyebrow: 'Free Project Estimate',
    heading: 'Get a Bid on Your Project',
    description:
      'Tell us about your project and receive a detailed, competitive bid from our experienced team. No obligation, no pressure.',
  },
  'construction.careers.header': {
    eyebrow: 'Join Our Team',
    heading: 'Build Your Career with TriCo Construction',
    description: 'We are always looking for skilled professionals across Utah, Idaho, and Arizona.',
    actionLabel: 'Apply Now',
    email: 'apply@tricoinc.com',
    positionsHeading: 'Open Positions',
  },
  'construction.careers.benefits': [
    {
      id: uid(41),
      icon: 'TrendingUp',
      title: 'Career Growth',
      description: 'Training and promotion opportunities',
    },
    {
      id: uid(42),
      icon: 'Users',
      title: 'Great Team',
      description: 'Experienced professionals in a supportive environment',
    },
    {
      id: uid(43),
      icon: 'Shield',
      title: 'Competitive Benefits',
      description: 'Health insurance, 401k, paid time off, and more',
    },
  ],
  'construction.careers.open-positions': [
    { id: uid(44), title: 'Concrete Finisher', location: 'Multiple Locations' },
    { id: uid(45), title: 'Equipment Operator', location: 'Multiple Locations' },
    { id: uid(46), title: 'Project Manager', location: 'Multiple Locations' },
    { id: uid(47), title: 'Laborer', location: 'Multiple Locations' },
    { id: uid(48), title: 'Estimator', location: 'Multiple Locations' },
  ],
  'construction.reviews.header': {
    eyebrow: "We'd Love Your Feedback",
    heading: 'Leave Us a Review',
    description:
      'Your feedback helps others discover the TriCo difference. Pick your favorite platform below.',
  },
  'construction.reviews.platforms': [
    {
      id: uid(49),
      name: 'Google',
      description: 'Share your experience and help others make an informed decision.',
      externalUrl: '',
    },
    {
      id: uid(50),
      name: 'Facebook',
      description: 'Share your experience and help others make an informed decision.',
      externalUrl: '',
    },
    {
      id: uid(51),
      name: 'Yelp',
      description: 'Share your experience and help others make an informed decision.',
      externalUrl: '',
    },
  ],
  'construction.reviews.footer': {
    message: 'Prefer to share feedback privately? Email',
    email: 'Office@tricoinc.com',
  },
  'construction.contact.header': {
    eyebrow: 'Contact Us',
    heading: 'Ready to Start Your Project?',
    description: 'Contact our team for a free project consultation and quote.',
  },
  'construction.contact.details': {
    addressLabel: 'Office Location',
    address: '194 West 12650 South Suite 100\nDraper, UT 84020',
    phoneLabel: 'Phone',
    phone: '(801) 571-8833',
    faxLabel: 'Fax',
    fax: '(801) 571-9888',
    emailLabel: 'Email',
    email: 'Office@tricoinc.com',
    officeHoursLabel: 'Office Hours',
    officeHours: 'Monday - Friday: 7am - 5pm',
  },
  'construction.footer.brand': {
    logo: { kind: 'managed', key: 'media/seed/trico-logo.png' },
    logoAltText: 'TriCo Construction',
    description:
      "Utah's trusted construction partner for over 40 years. Quality craftsmanship on every project.",
    address: '194 W 12650 S Suite 100, Draper, UT 84020',
    phone: '(801) 571-8833',
    email: 'Office@tricoinc.com',
  },
  'construction.footer.links': [
    { id: uid(52), label: 'Concrete', destination: 'services' },
    { id: uid(53), label: 'Multi-Housing', destination: 'services' },
    { id: uid(54), label: 'Underground Utilities', destination: 'services' },
    { id: uid(55), label: 'Excavation', destination: 'services' },
    { id: uid(56), label: 'Office Construction', destination: 'services' },
    { id: uid(57), label: 'Projects', destination: 'projects' },
    { id: uid(58), label: 'Contact', destination: 'contact' },
  ],
  'construction.footer.licenses': {
    heading: 'Licenses',
    licenses: [
      { id: uid(59), label: 'UT GC LIC# 252522-5501' },
      { id: uid(60), label: 'AZ LIC ROC# 337048' },
      { id: uid(61), label: 'ID LIC RCE# 54338' },
    ],
  },
  'construction.footer.legal': {
    organizationName: 'TriCo Construction',
    rightsNotice: 'All rights reserved.',
  },
};

const categorySeeds = Object.fromEntries(
  constructionProjectStatuses.flatMap((status) =>
    constructionCategoryIds.flatMap((category) => {
      const group = status === 'current' ? 'current-projects' : 'completed-projects';
      const [label, subject] = categories[category];
      const suffix = status === 'current' ? ' currently underway.' : ' built for long-term value.';
      return [
        [`construction.${group}.category.${category}`, { label, blurb: `${subject}${suffix}` }],
        [`construction.${group}.projects.${category}`, []],
      ];
    }),
  ),
) as Readonly<Record<string, EditableValue>>;

export const constructionV2SeedData: Readonly<Record<string, EditableValue>> = {
  ...baseSeeds,
  ...categorySeeds,
};
