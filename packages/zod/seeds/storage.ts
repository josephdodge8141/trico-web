import type { EditableValue } from '../schemas/content.js';

export const storageV2SeedData = {
  'storage.anniversary-banner': { message: '40+ Years of Excellence' },
  'storage.header': {
    logo: { kind: 'managed', key: 'media/seed/trico-storage-logo.png' },
    logoAltText: 'TriCo Storage Management',
    navLinks: [
      { id: '9aa17a00-1da3-4efe-b91e-b6e37c6a3411', label: 'Services', destination: 'services' },
      {
        id: 'a41d32bf-01a7-4e58-b9ca-293c0c8af9b7',
        label: 'Features',
        destination: 'features',
      },
      { id: '668ca850-f5a3-40da-8224-8d759e65e885', label: 'About', destination: 'about' },
      { id: '9f73c6b5-0b11-4c21-8f3e-c48b7bb5f6a1', label: 'Careers', destination: 'careers' },
      { id: 'd182bd67-1343-4d64-919e-b7b2db1bc531', label: 'Contact', destination: 'contact' },
    ],
  },
  'storage.hero': {
    primaryBadge: 'Professional Storage Management',
    serviceAreaBadge: 'Servicing Utah & Idaho',
    heading: 'Maximize Your Storage Facility Profitability',
    subheading:
      'Performance driven, relationship based operations designed to maximize profitability and protect long term investment value.',
    description:
      'We deliver measurable results under your brand, with a co-branded approach available when it adds value.',
    primaryActionLabel: 'Partner With Us',
    secondaryActionLabel: 'Our Services',
    image: { kind: 'managed', key: 'media/seed/storage-hero.png' },
    imageAltText: 'Professional storage management facility',
    imageCaption: 'Professional Storage Management',
  },
  'storage.hero.stats': [
    {
      id: '4cfafa22-829c-55e5-a623-d9ab2e00b4e1',
      value: '40+',
      label: 'Years Experience',
      icon: 'TrendingUp',
    },
    {
      id: '4dfafbb5-819c-5452-a523-d8182d00b34e',
      value: '20+',
      label: 'Facilities Managed',
      icon: 'Warehouse',
    },
  ],
  'storage.services.header': {
    eyebrow: 'Our Services',
    heading: 'Complete Storage Management',
    description:
      'We manage your storage facility across every critical function, focused on performance, transparency, and long term investment growth.',
  },
  'storage.services.items': [
    {
      id: 'd5c4a195-03b0-5606-a0af-c18cc14d1872',
      icon: 'BarChart3',
      title: 'Financial Performance & Reporting',
      description:
        'Focused on profitability, expense control, revenue optimization, and transparent reporting that supports informed decision making.',
    },
    {
      id: 'd4c4a002-04b0-5799-a1af-c31fc24d1a05',
      icon: 'Settings',
      title: 'Operations, Facility, & Team Management',
      description:
        'Oversight of daily operations, facilities, and teams focused on consistent performance and superior customer experience.',
    },
    {
      id: 'd3c49e6f-01b0-52e0-a2af-c4b2bf4d154c',
      icon: 'Shield',
      title: 'Asset Protection & Risk Management',
      description:
        'Proactive measures and operational controls that protect your facility, tenants, and long term asset value.',
    },
    {
      id: 'd2c49cdc-02b0-5473-a3af-c645c04d16df',
      icon: 'Target',
      title: 'Marketing & Demand Generation',
      description:
        'Strategic marketing execution designed to increase visibility, drive demand, and support sustainable occupancy growth.',
    },
    {
      id: 'd1c49b49-07b0-5c52-acaf-bb40bd4d1226',
      icon: 'Users',
      title: 'Ownership & Branding Flexibility',
      description:
        'Your brand remains front and center, with a co-branded approach available when it adds value.',
    },
    {
      id: 'd0c499b6-08b0-5de5-adaf-bcd3be4d13b9',
      icon: 'DollarSign',
      title: 'Delinquency & Lien Management',
      description:
        "Consistent and compliant management of delinquent accounts, lien processes, and auctions to recover revenue while protecting customer relationships and your facility's reputation.",
    },
    {
      id: 'cfc49823-05b0-592c-aeaf-be66bb4d0f00',
      icon: 'Building',
      title: 'Development Support & Advisory',
      description:
        'Strategic guidance for owners and developers during planning, expansion, and lease up phases, informed by hands-on operational experience and market insight to support long term performance and investment success.',
    },
    {
      id: 'cec49690-06b0-5abf-afaf-bff9bc4d1093',
      icon: 'Handshake',
      title: 'Third Party Management',
      description:
        'We provide third party storage management tailored to ownership goals, delivering hands on operations, financial oversight, and marketing support while working as a collaborative operating partner. Administrative fees remain with the property, keeping revenue aligned with ownership.',
    },
    {
      id: 'ddc4ae2d-0bb0-529e-a8af-ce24c94d250a',
      icon: 'ClipboardCheck',
      title: 'Standardized Systems & Controls',
      description:
        'Consistent operating systems and controls that support accuracy, efficiency, and reliable reporting across all managed facilities.',
    },
    {
      id: 'dcc4ac9a-0cb0-5431-a9af-cfb7ca4d269d',
      icon: 'MessageSquare',
      title: 'Direct Management Access & Communication',
      description:
        'Clear communication and direct access to management, ensuring timely decision making, transparency, and strong alignment with ownership goals.',
    },
    {
      id: '23882eb6-0b17-5f0b-a6b0-42fd1460416f',
      icon: 'Monitor',
      title: 'Technology & Operational Systems',
      description:
        'Industry aligned technology and operational systems designed to support accurate data, consistent execution, and informed management decisions.',
    },
    {
      id: '24883049-0a17-5d78-a5b0-416a13603fdc',
      icon: 'FileText',
      title: 'Structured Transitions & Onboarding',
      description:
        'A disciplined onboarding process that protects revenue, ensures continuity, and creates a smooth transition for owners and onsite teams.',
    },
  ],
  'storage.team.header': {
    eyebrow: 'Meet the Team',
    heading: 'Your Management Team',
    description:
      "Experienced professionals dedicated to maximizing your storage facility's performance.",
  },
  'storage.team.members': [
    {
      id: '8faf684f-b5b2-5820-aa37-966ad05a7934',
      name: 'Steve Tripp',
      role: 'Leadership',
      bio: 'Bio coming soon.',
      image: { kind: 'managed', key: 'media/seed/steve-tripp.png' },
      imageAltText: 'Steve Tripp',
    },
    {
      id: '8eaf66bc-b6b2-59b3-ab37-97fdd15a7ac7',
      name: 'Amber Lamborn',
      role: 'Leadership',
      bio: 'Bio coming soon.',
      image: { kind: 'managed', key: 'media/seed/amber-lamborn.jpeg' },
      imageAltText: 'Amber Lamborn',
    },
    {
      id: '91af6b75-b7b2-5b46-a837-9344d25a7c5a',
      name: 'Lynette Staker',
      role: 'Managing Director of Storage',
      bio: 'Lynette Staker serves as TriCo Realty & Investments Managing Director of Storage with more than 22 years of experience in the self-storage industry. She began her career in operations after transitioning from a paralegal role and quickly found her passion in the storage industry, where she has since held roles spanning site level operations, multi-site leadership, and executive oversight. Prior to joining Trico in May 2025, Lynette oversaw operations for more than 35 properties, oversaw two area managers, and supported a team of approximately 60 employees. Since joining Trico, Lynette has focused on organizing and strengthening standard operating procedures, streamlining processes, and driving disciplined revenue management.',
      image: { kind: 'managed', key: 'media/seed/lynette-staker.jpg' },
      imageAltText: 'Lynette Staker',
    },
    {
      id: '90af69e2-b8b2-5cd9-a937-94d7d35a7ded',
      name: 'Deborah Peterson',
      role: 'Office Assistant',
      bio: 'With 10 years of experience in the self-storage industry, Deborah Peterson serves as Office Assistant, bringing a strong foundation in both site level operations and administrative support. Her background includes six years as a part-time assistant site manager, two years as a site manager, and two years in an operations support role, giving her a well-rounded understanding of storage facility operations. In her current role, she provides office and administrative support, assists with documentation and coordination, and helps support operational processes across the organization.',
      image: { kind: 'managed', key: 'media/seed/deborah-peterson.jpeg' },
      imageAltText: 'Deborah Peterson',
    },
  ],
  'storage.about': {
    eyebrow: 'Why TriCo Storage',
    heading: 'Our Why',
    introduction:
      'We built our storage division to serve owners who want more than a “one size fits all” management model. Too often, independent owners are forced to choose between large REIT style operators and managing facilities on their own.',
    bridge: 'Our approach was designed to bridge that gap.',
    detail:
      'We bring disciplined, performance driven management without sacrificing owner control, transparency, or the customer experience. Every facility we manage is treated as a long term investment, not a short term revenue play.',
    conclusion:
      'We believe storage management works best when it is hands on, relationship based, and aligned with ownership goals.',
    statValue: '20+',
    statLabel: 'Facilities Managed',
    actionLabel: 'Partner With Us',
  },
  'storage.reviews.header': {
    eyebrow: "We'd Love Your Feedback",
    heading: 'Leave Us a Review',
    description:
      'Your feedback helps us grow and lets others discover the TriCo difference. It only takes a minute — pick your favorite platform below.',
  },
  'storage.reviews.platforms': [
    {
      id: '1ef461a6-14a4-5033-a2d7-f4adc755312f',
      name: 'Google',
      description: 'Share your experience on Google Reviews — helps neighbors find us.',
      externalUrl: '',
    },
    {
      id: '1ff46339-13a4-5ea0-a1d7-f31ac6552f9c',
      name: 'Facebook',
      description: 'Recommend us on Facebook so your network can see it too.',
      externalUrl: '',
    },
    {
      id: '1cf45e80-16a4-5359-a0d7-f187c9553455',
      name: 'Yelp',
      description: 'Leave a Yelp review to help others make an informed decision.',
      externalUrl: '',
    },
  ],
  'storage.reviews.footer': {
    message: 'Prefer to share feedback privately?',
    email: 'Office@tricoinc.com',
  },
  'storage.contact.header': {
    eyebrow: 'Contact Us',
    heading: "Ready to Maximize Your Facility's Potential?",
    description:
      "Let's discuss how TriCo Storage Management can help increase your facility's profitability while reducing operational headaches.",
  },
  'storage.contact.details': {
    address: '194 West 12650 South Suite 100\nDraper, UT 84020',
    phone: '(801) 571-8833',
    fax: '(801) 571-9888',
    email: 'Office@tricoinc.com',
    officeHours: 'Monday - Friday: 8am - 6pm',
  },
  'storage.footer.brand': {
    logo: { kind: 'managed', key: 'media/seed/trico-storage-logo.png' },
    logoAltText: 'TriCo Storage Management',
    description:
      'Professional storage facility management maximizing profitability while maintaining excellent customer satisfaction.',
    address: '194 W 12650 S Suite 100, Draper, UT 84020',
    phone: '(801) 571-8833',
    email: 'Office@tricoinc.com',
  },
  'storage.footer.links': [
    {
      id: 'e28c7ceb-5db3-5c00-a346-1152b02b9bc4',
      label: 'Financial Management',
      destination: 'services',
    },
    {
      id: 'e18c7b58-5eb3-5d93-a446-12e5b12b9d57',
      label: 'Revenue Optimization',
      destination: 'services',
    },
    {
      id: 'e48c8011-5fb3-5f26-a146-0e2cb22b9eea',
      label: 'Property Inspections',
      destination: 'services',
    },
    {
      id: 'e38c7e7e-60b3-50b9-a246-0fbfb32ba07d',
      label: 'Marketing Services',
      destination: 'services',
    },
    {
      id: 'e68c8337-61b3-524c-af46-0b06ac2b9578',
      label: 'Branding Options',
      destination: 'features',
    },
    { id: 'e58c81a4-62b3-53df-a046-0c99ad2b970b', label: 'About', destination: 'about' },
    { id: 'e88c865d-63b3-5572-ad46-07e0ae2b989e', label: 'Contact', destination: 'contact' },
  ],
  'storage.footer.branding-options': [
    { id: 'd09e723e-930a-5893-a942-1949cf2ee177', label: 'Your Brand' },
    { id: 'd19e73d1-920a-5700-a842-17b6ce2edfe4', label: 'Our Brand' },
    { id: 'ce9e6f18-950a-5bb9-a742-1623d12ee49d', label: 'Co-Brand' },
  ],
  'storage.footer.legal': {
    organizationName: 'TriCo Storage Management',
    rightsNotice: 'All rights reserved.',
  },
} as const satisfies Readonly<Record<`storage.${string}`, EditableValue>>;
