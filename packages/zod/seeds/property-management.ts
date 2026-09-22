const migrationNamespace = 'c63b8c48-2f88-5a33-9b55-f5430eb6764a';
function fnv1a(value: string, seed: number): number {
  let hash = seed >>> 0;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}
function deterministicId(entityId: string, position: number): string {
  const input = `${migrationNamespace}:${entityId}:${String(position)}`;
  const words = [
    fnv1a(input, 2_166_136_261),
    fnv1a(input, 2_166_136_261 ^ 0x9e3779b9),
    fnv1a(input, 2_166_136_261 ^ 0x85ebca6b),
    fnv1a(input, 2_166_136_261 ^ 0xc2b2ae35),
  ];
  const hex = words.map((word) => word.toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
function id(value: number): string {
  const range = [
    { start: 9, end: 11, entityId: 'property-management.hero.stats' },
    { start: 12, end: 19, entityId: 'property-management.services.items' },
    { start: 20, end: 24, entityId: 'property-management.process.steps' },
    { start: 25, end: 31, entityId: 'property-management.portfolio.managed.items' },
    { start: 32, end: 33, entityId: 'property-management.portfolio.coas.items' },
    { start: 34, end: 36, entityId: 'property-management.portfolio.hoas.items' },
    { start: 37, end: 39, entityId: 'property-management.tenant-portal.features' },
    { start: 40, end: 43, entityId: 'property-management.team.members' },
    { start: 44, end: 49, entityId: 'property-management.about.features' },
    { start: 50, end: 53, entityId: 'property-management.testimonials.items' },
    { start: 54, end: 57, entityId: 'property-management.testimonials.stats' },
    { start: 58, end: 63, entityId: 'property-management.faq.items' },
    { start: 64, end: 66, entityId: 'property-management.reviews.platforms' },
    { start: 70, end: 81, entityId: 'property-management.footer.links' },
    { start: 82, end: 85, entityId: 'property-management.footer.social' },
  ].find(({ start, end }) => value >= start && value <= end);
  return range === undefined
    ? `123e4567-e89b-5000-8000-${String(value).padStart(12, '0')}`
    : deterministicId(range.entityId, value - range.start);
}
const placeholder = { kind: 'managed' as const, key: 'media/seed/placeholder-neutral.svg' };

export const propertyManagementV2SeedData = {
  'property-management.anniversary-banner': { message: '40+ Years of Excellence' },
  'property-management.header': {
    logo: { kind: 'managed', key: 'media/seed/trico-property-management-logo.png' },
    logoAltText: 'TriCo Property Management',
    divisionLabel: 'Property Management',
    phone: '(801) 571-8833',
    actionLabel: 'Free Analysis',
    navLinks: [
      { id: id(1), label: 'Services', destination: 'services' },
      { id: id(2), label: 'What to Expect', destination: 'process' },
      { id: id(3), label: 'Portfolio', destination: 'managed-properties' },
      { id: id(4), label: 'Tenant Portal', destination: 'tenant-portal' },
      { id: id(5), label: 'About', destination: 'about' },
      { id: id(6), label: 'FAQ', destination: 'faq' },
      { id: id(7), label: 'Reviews', destination: 'reviews' },
      { id: id(86), label: 'Careers', destination: 'careers' },
      { id: id(8), label: 'Contact', destination: 'contact' },
    ],
  },
  'property-management.hero': {
    eyebrow: 'Professional Property Management',
    heading: 'What to Expect with TriCo',
    description:
      'Partnering with TriCo means high occupancy rates, strategic leasing, and expert financial management for your investment properties.',
    primaryActionLabel: 'Get Free Analysis',
    secondaryActionLabel: 'Our Services',
    image: placeholder,
    imageAltText: 'Property Management hero photo coming soon',
  },
  'property-management.hero.stats': [
    { id: id(9), value: '95%', label: 'Occupancy Rate', icon: 'BarChart3' },
    { id: id(10), value: '300+', label: 'Properties', icon: 'Building2' },
    { id: id(11), value: '40+', label: 'Years Experience', icon: 'Users' },
  ],
  'property-management.services.header': {
    eyebrow: 'Our Services',
    heading: 'The TriCo Experience',
    description:
      'We provide full-service property management designed to maximize your investment. With a 95% occupancy rate, seamless lease-ups, and cost-conscious management, we ensure your property is optimized for success.',
  },
  'property-management.services.items': [
    {
      id: id(12),
      icon: 'Home',
      title: 'Residential Management',
      description:
        'Full-service management with fast lease-ups and proactive maintenance to ensure high occupancy rates and tenant satisfaction.',
    },
    {
      id: id(13),
      icon: 'Building',
      title: 'Commercial Management',
      description:
        'Strategic tenant retention, transparent operations, and cost-effective service for offices, retail, and industrial spaces.',
    },
    {
      id: id(14),
      icon: 'Wallet',
      title: 'Asset Management',
      description:
        'Comprehensive financial reporting, rent collection, and strategic budgeting with complete transparency and no hidden fees.',
    },
    {
      id: id(15),
      icon: 'Calculator',
      title: 'CAM Reconciliation',
      description:
        'Accurate Common Area Maintenance reconciliation ensuring fair cost allocation, transparent billing, and compliance with lease agreements.',
    },
    {
      id: id(16),
      icon: 'Wrench',
      title: 'Maintenance Services',
      description:
        '24/7 emergency response and preventive maintenance programs to keep your properties in prime condition.',
    },
    {
      id: id(17),
      icon: 'Users',
      title: 'Tenant Relations',
      description:
        'Professional tenant screening, lease management, and responsive communication to foster long-term occupancy.',
    },
    {
      id: id(18),
      icon: 'Building2',
      title: 'HOA & COA Management',
      description:
        'Comprehensive management for Homeowners Associations and Commercial Owners Associations, including dues collection, covenant enforcement, maintenance coordination, and transparent financial reporting.',
    },
    {
      id: id(19),
      icon: 'BarChart3',
      title: 'Investment Analysis',
      description:
        'Data-driven insights and ROI optimization strategies to maximize the profitability of your real estate investments.',
    },
  ],
  'property-management.process.header': {
    eyebrow: 'Our Process',
    heading: 'Take a Look at Our Process',
    description:
      "TriCo's full-service approach ensures a transparent, results-driven property management experience. From the initial consultation to ongoing management, we give property owners peace of mind while maximizing their ROI.",
  },
  'property-management.process.steps': [
    {
      id: id(20),
      number: '01',
      icon: 'ClipboardCheck',
      title: 'Property Assessment',
      description:
        'We start with a comprehensive property assessment to understand your goals and create a tailored management strategy.',
    },
    {
      id: id(21),
      number: '02',
      icon: 'Settings',
      title: 'Seamless Onboarding',
      description:
        'From tenant communication to financial setup, we handle every detail to ensure a smooth start and keep operations running seamlessly.',
    },
    {
      id: id(22),
      number: '03',
      icon: 'Wrench',
      title: 'Proactive Maintenance',
      description:
        'With prompt maintenance response and proactive upkeep, we keep properties in prime condition while ensuring tenant satisfaction.',
    },
    {
      id: id(23),
      number: '04',
      icon: 'LineChart',
      title: 'Financial Optimization',
      description:
        'With data-driven insights and no hidden fees, our financial management strategies help optimize cash flow and maximize profitability.',
    },
    {
      id: id(24),
      number: '05',
      icon: 'Heart',
      title: 'Tenant Retention',
      description:
        'We prioritize tenant satisfaction and long-term occupancy, fostering strong relationships through personalized service.',
    },
  ],
  'property-management.portfolio.managed.header': {
    eyebrow: 'Our Portfolio',
    heading: 'Properties We Currently Manage',
    description:
      'A snapshot of the residential and commercial properties under TriCo management across Utah.',
  },
  'property-management.portfolio.managed.items': [
    {
      id: id(25),
      name: 'Town Square',
      description: '392 E 12300 S, Draper, UT 84020',
      photo: { kind: 'managed', key: 'media/seed/town-square.jpg' },
      photoAltText: 'Town Square property',
    },
    {
      id: id(26),
      name: 'Country Square',
      description: '1870 W 12600 S, Riverton, UT 84020',
      photo: { kind: 'managed', key: 'media/seed/country-square.jpg' },
      photoAltText: 'Country Square property',
    },
    {
      id: id(27),
      name: 'Alta Medical',
      description: '1025 E 11400 S, Sandy, UT 84020',
      photo: { kind: 'managed', key: 'media/seed/alta-medical.jpg' },
      photoAltText: 'Alta Medical property',
    },
    {
      id: id(28),
      name: 'American Fork Industrial',
      description: '1305 S 630 E, American Fork, UT 84003',
      photo: { kind: 'managed', key: 'media/seed/american-fork-industrial.jpg' },
      photoAltText: 'American Fork Industrial property',
    },
    {
      id: id(29),
      name: 'Bluffdale Industrial',
      description: '14881 S Concord Drive, Bluffdale, UT 84065',
      photo: { kind: 'managed', key: 'media/seed/bluffdale-industrial.jpg' },
      photoAltText: 'Bluffdale Industrial property',
    },
    {
      id: id(30),
      name: 'Draper Office',
      description: '218 W 12650 S, Draper, UT 84020',
      photo: { kind: 'managed', key: 'media/seed/draper-office-218.jpg' },
      photoAltText: 'Draper Office at 218 West',
    },
    {
      id: id(31),
      name: 'Draper Office',
      description: '194 W 12650 S, Draper, UT 84020',
      photo: { kind: 'managed', key: 'media/seed/draper-office-194.jpg' },
      photoAltText: 'Draper Office at 194 West',
    },
  ],
  'property-management.portfolio.coas.header': {
    eyebrow: 'Associations',
    heading: 'Commercial Owners Associations',
    description: 'We proudly manage the following Commercial Owners Associations (COAs).',
  },
  'property-management.portfolio.coas.items': [
    {
      id: id(32),
      name: 'Laurel Square',
      description: '292 E 12200 S, Draper, UT 84020',
      photo: { kind: 'managed', key: 'media/seed/laurel-square.jpg' },
      photoAltText: 'Laurel Square',
    },
    {
      id: id(33),
      name: 'California Crossing',
      description: '1755 Sequoia Vista Cir., Salt Lake City, UT 84104',
      photo: { kind: 'managed', key: 'media/seed/california-crossing.jpg' },
      photoAltText: 'California Crossing',
    },
  ],
  'property-management.portfolio.hoas.header': {
    eyebrow: 'Homeowner Associations',
    heading: 'Homeowners Associations',
    description: 'We proudly manage the following Homeowners Associations (HOAs).',
  },
  'property-management.portfolio.hoas.items': [
    {
      id: id(34),
      name: 'Arbor Plaza',
      description: '8-unit townhome HOA · 5025 S Highland Drive, Holladay, UT',
      photo: { kind: 'managed', key: 'media/seed/arbor-plaza.png' },
      photoAltText: 'Arbor Plaza',
    },
    {
      id: id(35),
      name: 'Juniper Ridge',
      description: '6-lot single-family home HOA · 1490 W 8600 S, West Jordan, UT',
      photo: placeholder,
      photoAltText: 'Juniper Ridge',
    },
    {
      id: id(36),
      name: 'Riverwood Crossing',
      description: '8-lot HOA · 13191 S Redwood Rd, Riverton, UT',
      photo: placeholder,
      photoAltText: 'Riverwood Crossing',
    },
  ],
  'property-management.tenant-portal': {
    eyebrow: 'Tenant Portal',
    heading: 'Tenant Portal',
    description:
      'Current tenants can access our online portal to pay rent, submit maintenance requests, and view account documents. Our portal is powered by Rent Manager, our trusted property management CRM.',
    actionLabel: 'Access Tenant Portal',
    externalUrl: 'https://tricopm.twa.rentmanager.com/',
    note: 'You will be redirected to Rent Manager to log in securely.',
  },
  'property-management.tenant-portal.features': [
    {
      id: id(37),
      icon: 'CreditCard',
      title: 'Pay Rent Online',
      description: 'Submit your monthly rent payment securely through the portal.',
    },
    {
      id: id(38),
      icon: 'Wrench',
      title: 'Request Maintenance',
      description: 'Submit and track maintenance requests anytime, day or night.',
    },
    {
      id: id(39),
      icon: 'FileText',
      title: 'Account Documents',
      description: 'Access your lease, statements, and account history in one place.',
    },
  ],
  'property-management.team.header': {
    eyebrow: 'Our Team',
    heading: 'Meet Our Property Management Experts',
    description:
      'Our dedicated team brings decades of experience to help you maximize your property investments.',
  },
  'property-management.team.members': [
    {
      id: id(40),
      name: 'Brooke Moore',
      title: 'Director of Property Management',
      description:
        'Brooke leads our property management division with dedication to excellence, ensuring every property achieves optimal performance and tenant satisfaction.',
      email: 'brooke@tricoinc.com',
      phone: '(808) 292-4634',
      photo: { kind: 'managed', key: 'media/seed/brooke-moore-pm.jpeg' },
      photoAltText: 'Brooke Moore',
    },
    {
      id: id(41),
      name: 'Mia Barlow',
      title: 'Property Manager',
      description:
        'Mia brings a detail-oriented approach to property management, ensuring tenants and owners alike receive exceptional service.',
      email: 'mia@tricoinc.com',
      phone: '(801) 571-8833',
      photo: { kind: 'managed', key: 'media/seed/mia-barlow.png' },
      photoAltText: 'Mia Barlow',
    },
    {
      id: id(42),
      name: 'Coming Soon',
      title: 'Property Manager',
      description: 'Join our growing team of property management professionals.',
      email: 'careers@tricoinc.com',
      phone: '(801) 571-8833',
      photo: placeholder,
      photoAltText: 'Future property manager',
    },
    {
      id: id(43),
      name: 'Coming Soon',
      title: 'Property Manager',
      description: 'Join our growing team of property management professionals.',
      email: 'careers@tricoinc.com',
      phone: '(801) 571-8833',
      photo: placeholder,
      photoAltText: 'Future property manager',
    },
  ],
  'property-management.about': {
    eyebrow: 'About TriCo',
    heading: 'Property Management Done Right',
    introduction:
      "With expert property oversight, financial transparency, and proactive maintenance, TriCo makes property ownership stress-free and profitable. We've been trusted by property owners for over 40 years to maximize their investments.",
    detail:
      "Our team of experienced professionals understands that every property is unique. That's why we tailor our management approach to meet your specific needs and goals, ensuring optimal performance and tenant satisfaction.",
    image: { kind: 'managed', key: 'media/seed/pm-commercial-property.jpeg' },
    imageAltText: 'Commercial property managed by TriCo Property Management',
    statValue: '40+',
    statLabel: 'Years of Excellence',
    actionLabel: 'Start Your Free Analysis',
  },
  'property-management.about.features': [
    '95% Average Occupancy Rate',
    'Transparent Financial Reporting',
    '24/7 Emergency Maintenance',
    'Strategic Tenant Screening',
    'No Hidden Fees',
    'Data-Driven Decision Making',
  ].map((title, index) => ({ id: id(44 + index), title })),
  'property-management.testimonials.header': {
    eyebrow: 'Testimonials',
    heading: 'What Our Clients Say',
    description:
      "Don't just take our word for it. Hear from property owners who have experienced the TriCo difference.",
  },
  'property-management.testimonials.items': [
    {
      id: id(50),
      name: 'Jennifer Martinez',
      role: 'Property Owner',
      image: {
        kind: 'external',
        url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      },
      imageAltText: 'Jennifer Martinez',
      rating: 5,
      quote:
        "TriCo has completely transformed how I manage my rental properties. Their proactive maintenance and tenant screening have reduced my vacancy rates significantly. I couldn't be happier with their service.",
    },
    {
      id: id(51),
      name: 'Michael Thompson',
      role: 'Multi-Family Investor',
      image: {
        kind: 'external',
        url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
      },
      imageAltText: 'Michael Thompson',
      rating: 5,
      quote:
        "After switching to TriCo, my portfolio's occupancy rate jumped to 97%. Their financial reporting is transparent and detailed, making tax season a breeze. Highly recommend for serious investors.",
    },
    {
      id: id(52),
      name: 'Sarah Chen',
      role: 'Commercial Property Owner',
      image: {
        kind: 'external',
        url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
      },
      imageAltText: 'Sarah Chen',
      rating: 5,
      quote:
        "The TriCo team's attention to detail and responsiveness is unmatched. They handle everything from tenant relations to maintenance with professionalism. My commercial properties have never been better managed.",
    },
    {
      id: id(53),
      name: 'David Rodriguez',
      role: 'First-Time Landlord',
      image: {
        kind: 'external',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      },
      imageAltText: 'David Rodriguez',
      rating: 5,
      quote:
        'As a first-time landlord, I was overwhelmed. TriCo made the entire process seamless. They found great tenants quickly and handle all the day-to-day management so I can focus on my career.',
    },
  ],
  'property-management.testimonials.stats': [
    { id: id(54), value: '500+', label: 'Properties Managed', icon: 'Building2' },
    { id: id(55), value: '98%', label: 'Client Satisfaction', icon: 'Users' },
    { id: id(56), value: '4.9', label: 'Average Rating', icon: 'Heart' },
    { id: id(57), value: '15+', label: 'Years Experience', icon: 'BarChart3' },
  ],
  'property-management.faq.header': {
    eyebrow: 'FAQs',
    heading: 'Frequently Asked Questions',
    description:
      'Have questions about our property management services? Find answers to common questions below.',
  },
  'property-management.faq.items': [
    {
      id: id(58),
      question:
        "How does TriCo ensure a smooth transition if I'm switching from another property management company?",
      answer:
        'We handle the entire transition process, from tenant communication and lease transfers to financial setup and maintenance coordination. Our team ensures minimal disruption while seamlessly integrating your property into our management system.',
    },
    {
      id: id(59),
      question: 'What makes TriCo different from other property management companies?',
      answer:
        'TriCo stands out with transparent operations, proactive maintenance, and a data-driven approach. We focus on tenant satisfaction, cost-efficient management, and strategic financial oversight, ensuring your investment is profitable, well-maintained, and stress-free.',
    },
    {
      id: id(60),
      question: 'How does TriCo handle financial reporting and tax management?',
      answer:
        'We provide monthly or quarterly financial reports covering rent collection, expenses, and cash flow. Our team also assists with tax compliance, strategic budgeting, and tax appeals, giving property owners a clear financial picture with no hidden fees.',
    },
    {
      id: id(61),
      question: 'What types of properties does TriCo manage?',
      answer:
        'We manage a diverse portfolio including single-family homes, multi-family apartments, commercial office spaces, retail properties, and industrial facilities. Our experienced team has the expertise to handle properties of any size or complexity.',
    },
    {
      id: id(62),
      question: 'How quickly can TriCo respond to maintenance emergencies?',
      answer:
        'We offer 24/7 emergency maintenance response. For urgent issues like water leaks, heating failures, or security concerns, our team is available around the clock. Routine maintenance requests are typically addressed within 24-48 hours.',
    },
    {
      id: id(63),
      question: "What is TriCo's tenant screening process?",
      answer:
        'Our comprehensive screening includes credit checks, background verification, employment verification, rental history review, and income verification. We ensure tenants meet our strict criteria to protect your investment and maintain property standards.',
    },
  ],
  'property-management.careers': {
    heading: 'Join Our Team',
    description:
      "We're always looking for talented individuals to join the Trico family. If you're passionate about property management and construction, we'd love to hear from you.",
    cardHeading: 'Ready to Apply?',
    cardDescription: 'Send your resume to start your journey with Trico.',
    email: 'apply@tricoinc.com',
  },
  'property-management.reviews.header': {
    eyebrow: "We'd Love Your Feedback",
    heading: 'Leave Us a Review',
    description:
      'Your feedback helps us grow and lets others discover the TriCo difference. It only takes a minute — pick your favorite platform below.',
  },
  'property-management.reviews.platforms': [
    {
      id: id(64),
      name: 'Google',
      description: 'Share your experience on Google Reviews — helps neighbors find us.',
      externalUrl: '',
    },
    {
      id: id(65),
      name: 'Facebook',
      description: 'Recommend us on Facebook so your network can see it too.',
      externalUrl: '',
    },
    {
      id: id(66),
      name: 'Yelp',
      description: 'Leave a Yelp review to help others make an informed decision.',
      externalUrl: '',
    },
  ],
  'property-management.reviews.footer': {
    privateFeedbackLabel: 'Prefer to share feedback privately?',
    email: 'Office@tricoinc.com',
  },
  'property-management.contact.header': {
    eyebrow: 'Contact Us',
    heading: 'Get Your Free Property Analysis',
    description:
      "Discover your property's potential with a free analysis from TriCo. We'll assess your property's performance and provide expert recommendations to improve occupancy, reduce costs, and increase returns.",
  },
  'property-management.contact.details': {
    address: '194 West 12650 South Suite 200\nDraper, UT 84020',
    phone: '(801) 571-8833',
    fax: '(801) 571-9888',
    email: 'propertymanagement@tricoinc.com',
    officeHours: 'Monday – Friday: 8am – 4pm',
    reviewLabel: 'Leave Us a Google Review',
    reviewUrl: 'https://www.google.com/search?q=Trico+Inc+Draper+UT',
    licenses: [
      { id: id(67), label: 'UT GC: 252522-5501' },
      { id: id(68), label: 'AZ ROC: 337048' },
      { id: id(69), label: 'ID RCE: 54338' },
    ],
  },
  'property-management.footer.brand': {
    logo: { kind: 'managed', key: 'media/seed/trico-property-management-logo.png' },
    logoAltText: 'TriCo Property Management',
    description:
      'Professional property management services designed to maximize your investment and provide peace of mind.',
  },
  'property-management.footer.links': [
    { id: id(70), group: 'Services', label: 'Residential Management', destination: 'services' },
    { id: id(71), group: 'Services', label: 'Commercial Management', destination: 'services' },
    { id: id(72), group: 'Services', label: 'Asset Management', destination: 'services' },
    { id: id(73), group: 'Services', label: 'Maintenance Services', destination: 'services' },
    { id: id(74), group: 'Company', label: 'About Us', destination: 'about' },
    { id: id(75), group: 'Company', label: 'What to Expect', destination: 'process' },
    { id: id(76), group: 'Company', label: 'FAQ', destination: 'faq' },
    { id: id(77), group: 'Company', label: 'Contact', destination: 'contact' },
    { id: id(78), group: 'Resources', label: 'Owner Portal', destination: 'tenant-portal' },
    { id: id(79), group: 'Resources', label: 'Tenant Portal', destination: 'tenant-portal' },
    { id: id(80), group: 'Resources', label: 'Pay Rent Online', destination: 'tenant-portal' },
    { id: id(81), group: 'Resources', label: 'Maintenance Request', destination: 'tenant-portal' },
  ],
  'property-management.footer.social': [
    { id: id(82), label: 'Facebook', externalUrl: '' },
    { id: id(83), label: 'Twitter', externalUrl: '' },
    { id: id(84), label: 'LinkedIn', externalUrl: '' },
    { id: id(85), label: 'Instagram', externalUrl: '' },
  ],
  'property-management.footer.legal': {
    organizationName: 'TriCo Property Management',
    rightsNotice: 'All rights reserved.',
    privacyLabel: 'Privacy Policy',
    termsLabel: 'Terms of Service',
  },
} as const;
