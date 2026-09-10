import type { EditableValue, EntityId } from '../schemas/content.js';

export const homeV2SeedData = {
  'home.anniversary-banner': { message: '40+ Years of Excellence' },
  'home.header.brand': {
    logo: { kind: 'managed', key: 'media/seed/trico-logo.png' },
    altText: 'Trico Inc',
  },
  'home.hero': {
    heading: "Building Utah's Future",
    description:
      "For over four decades, Trico has been a cornerstone of Utah's growth—delivering excellence in property management, real estate, construction, and storage solutions.",
  },
  'home.divisions.header': {
    heading: 'Our Divisions',
    description:
      'Explore our family of companies, each dedicated to excellence in their respective fields.',
  },
  'home.divisions.items': [
    {
      id: '7ab79385-f022-5b82-a0de-e44c9a7e04ee',
      title: 'Real Estate',
      description:
        'Expert real estate services including buying, selling, and leasing residential and commercial properties.',
      icon: 'Home',
      destination: { kind: 'page', pageId: 'real-estate' },
    },
    {
      id: '79b791f2-f122-5d15-a1de-e5df9b7e0681',
      title: 'Property Management',
      description:
        'Professional commercial and residential property management services with over 40 years of excellence.',
      icon: 'Building2',
      destination: { kind: 'page', pageId: 'property-management' },
    },
    {
      id: '78b7905f-ee22-585c-a2de-e772987e01c8',
      title: 'Construction',
      description:
        'Quality construction services for commercial and residential projects throughout Utah, Idaho, and Arizona.',
      icon: 'HardHat',
      destination: { kind: 'page', pageId: 'construction' },
    },
    {
      id: '77b78ecc-ef22-59ef-a3de-e905997e035b',
      title: 'Storage Management',
      description: 'Secure and convenient storage solutions for personal and business needs.',
      icon: 'Warehouse',
      destination: { kind: 'page', pageId: 'storage' },
    },
    {
      id: '76b78d39-ec22-5536-acde-de009e7e0b3a',
      title: 'Development',
      description:
        'Full-service land acquisition and residential and commercial development across Utah, Idaho, and Arizona.',
      icon: 'Mountain',
      destination: { kind: 'page', pageId: 'development' },
    },
  ],
  'home.core-values.header': {
    heading: 'Our Core Values',
    description: 'The principles that guide everything we do at Trico.',
  },
  'home.core-values.items': [
    {
      id: '49d3635d-275d-5c86-a489-90a01fceb7aa',
      title: 'Integrity',
      description: 'We conduct business with honesty and transparency in every interaction.',
      icon: 'Shield',
    },
    {
      id: '48d361ca-285d-5e19-a589-923320ceb93d',
      title: 'Excellence',
      description: 'We strive for the highest standards in everything we do.',
      icon: 'Target',
    },
    {
      id: '47d36037-255d-5960-a689-93c61dceb484',
      title: 'Community',
      description: "We're committed to building and strengthening Utah's communities.",
      icon: 'Heart',
    },
    {
      id: '46d35ea4-265d-5af3-a789-95591eceb617',
      title: 'Teamwork',
      description: 'We collaborate across divisions to deliver exceptional results.',
      icon: 'Users',
    },
  ],
  'home.journey.header': {
    eyebrow: 'A Family Legacy Since 1927',
    heading: 'Our Journey',
    description: "Nearly a century of building Utah's future, one milestone at a time.",
    history:
      "Trico's roots trace back to 1927 when Francis Earl Tripp founded Tripp Construction. The family legacy continued when his son Stephen Tripp Senior took the reins in 1965, growing the business and eventually renaming it Trico Construction in 1987. In 2008, Stephen Tripp Jr. stepped into leadership. In 2018, he partnered with Randy Rimmer to expand the company into a diversified family of services spanning real estate, property management, construction, storage, and development across Utah, Idaho, and Arizona.",
  },
  'home.journey.timeline': [
    {
      id: '8b9b3784-2173-5455-a7b9-53772140aaf1',
      year: '1927',
      event: 'Francis Earl Tripp founded Tripp Construction in Utah',
    },
    {
      id: '8c9b3917-2073-52c2-a6b9-51e42040a95e',
      year: '1965',
      event: 'Stephen Tripp Senior took over the family business',
    },
    {
      id: '8d9b3aaa-1f73-512f-a9b9-569d1f40a7cb',
      year: '1987',
      event: 'Renamed to Trico Construction, expanding services',
    },
    {
      id: '8e9b3c3d-1e73-5f9c-a8b9-550a1e40a638',
      year: '2008',
      event: 'Stephen Tripp Jr. took over the family business',
    },
    {
      id: '879b3138-1d73-5e09-a3b9-4d2b2540b13d',
      year: '2016',
      event: 'Added storage management services',
    },
    {
      id: '889b32cb-1c73-5c76-a2b9-4b982440afaa',
      year: '2018',
      event: 'Partnered with Randy Rimmer to expand services',
    },
    {
      id: '899b345e-1b73-5ae3-a5b9-50512340ae17',
      year: '2020',
      event: 'Expanded operations to Arizona & Idaho',
    },
    {
      id: '8a9b35f1-1a73-5950-a4b9-4ebe2240ac84',
      year: 'Today',
      event: 'Three generations strong, serving clients across 3 states',
    },
  ],
  'home.leadership.header': {
    heading: 'Leadership Team',
    description: "Meet the people driving Trico's vision forward.",
    note: 'Contact us to learn more about our leadership team.',
  },
  'home.leadership.members': [
    {
      id: 'ed93cfdf-7b74-5e0e-afb3-dce8675341da',
      name: 'Stephen Tripp',
      role: 'Founder & President',
      photo: { kind: 'managed', key: 'media/seed/steve-tripp.png' },
      photoAltText: 'Stephen Tripp',
    },
    {
      id: 'ec93ce4c-7c74-5fa1-a0b3-de7b6853436d',
      name: 'Randy Rimmer',
      role: 'Vice President',
      photo: { kind: 'managed', key: 'media/seed/randy-rimmer.png' },
      photoAltText: 'Randy Rimmer',
    },
    {
      id: 'ef93d305-7974-5ae8-a1b3-e00e65533eb4',
      name: 'Amber Lamborn',
      role: 'CFO',
      photo: { kind: 'managed', key: 'media/seed/amber-lamborn.jpeg' },
      photoAltText: 'Amber Lamborn',
    },
    {
      id: 'ee93d172-7a74-5c7b-a2b3-e1a166534047',
      name: 'Brooke Moore',
      role: 'Director',
      photo: { kind: 'managed', key: 'media/seed/brooke-moore-landing.jpeg' },
      photoAltText: 'Brooke Moore',
    },
  ],
  'home.news.header': {
    heading: 'News & Updates',
    description: 'Stay up to date with the latest from Trico.',
  },
  'home.news.items': [
    {
      id: 'd7054408-ddaf-5d39-ad30-19e73fdf5c65',
      date: '2024-12-01',
      title: 'New Website Launch',
      description: 'Trico unveils redesigned website to better serve our clients and community.',
    },
    {
      id: 'd805459b-dcaf-5ba6-ac30-18543edf5ad2',
      date: '2024-11-01',
      title: 'Expansion into New Markets',
      description: 'Continuing our growth strategy with new development projects across Utah.',
    },
    {
      id: 'd905472e-dbaf-5a13-af30-1d0d3ddf593f',
      date: '2024-10-01',
      title: 'Community Partnership',
      description: 'Trico partners with local organizations to support Utah families.',
    },
  ],
  'home.careers.header': {
    heading: 'Join Our Team',
    description:
      "Build your career with Utah's premier diversified property company. We offer opportunities across all four divisions with competitive benefits and growth potential.",
  },
  'home.careers.open-positions': [
    {
      id: '265031ef-949f-5ede-a813-dd90bdbb59da',
      title: 'Property Manager',
      division: 'Property Management',
      employmentType: 'Full-time',
    },
    {
      id: '2550305c-959f-5071-a913-df23bebb5b6d',
      title: 'Project Coordinator',
      division: 'Construction',
      employmentType: 'Full-time',
    },
    {
      id: '28503515-929f-5bb8-aa13-e0b6bbbb56b4',
      title: 'Leasing Agent',
      division: 'Real Estate',
      employmentType: 'Full-time',
    },
    {
      id: '27503382-939f-5d4b-ab13-e249bcbb5847',
      title: 'Administrative Assistant',
      division: 'Corporate',
      employmentType: 'Full-time',
    },
  ],
  'home.careers.resume-intro': {
    heading: 'Submit Your Resume',
    description: "Fill out the form below and attach your resume — we'll get back to you soon.",
  },
  'home.contact': {
    heading: 'Get In Touch',
    description: 'Ready to work with us? Contact our team today.',
    address: '194 West 12650 South Suite 100, Draper UT 84020',
    email: 'Office@tricoinc.com',
    phone: '(801) 571-8833',
    fax: '(801) 571-9888',
    licenses: [
      { id: '0a7fb760-dbf1-4b67-a1cc-4fc65e03c9d1', label: 'UT GC LIC# 252522-5501' },
      { id: '4d2a1306-025a-430d-b96c-1f334bfc953f', label: 'AZ LIC ROC# 337048' },
      { id: '7aab34a5-e96b-4ee2-a7ae-17728ce6b112', label: 'ID LIC RCE# 54338' },
    ],
  },
  'home.footer': {
    logo: { kind: 'managed', key: 'media/seed/trico-logo.png' },
    altText: 'Trico Inc',
    organizationName: 'Trico Inc.',
    rightsNotice: 'All rights reserved.',
  },
} as const satisfies Readonly<Record<`home.${string}`, EditableValue>>;

export type HomeEntityId = keyof typeof homeV2SeedData & EntityId;
