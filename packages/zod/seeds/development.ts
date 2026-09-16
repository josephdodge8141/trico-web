import type { EditableValue } from '../schemas/content.js';
import { developmentEntityDefinitions } from '../schemas/development.js';

const managed = (key: string) => ({ kind: 'managed' as const, key });

export const developmentV2SeedData = {
  'development.anniversary-banner': {
    message: 'Celebrating 40 Years of Excellence',
    years: '1984 – 2024',
  },
  'development.header': {
    logo: managed('media/seed/trico-logo.png'),
    logoAltText: 'TriCo Development',
    divisionLabel: 'Development',
    phone: '(801) 571-8833',
    actionLabel: 'Get Started',
    navLinks: [
      { id: 'd16faaeb-8474-5d68-abcc-4816af12c3dc', label: 'Services', destination: 'services' },
      { id: 'd06fa958-8574-5efb-accc-49a9b012c56f', label: 'Projects', destination: 'projects' },
      { id: 'd36fae11-8674-508e-a9cc-44f0b112c702', label: 'Team', destination: 'team' },
      { id: 'd26fac7e-8774-5221-aacc-4683b212c895', label: 'About', destination: 'about' },
      { id: 'd56fb137-8874-53b4-afcc-4e62ab12bd90', label: 'Reviews', destination: 'reviews' },
      { id: 'd46fafa4-8974-5547-a0cc-4ff5ac12bf23', label: 'Contact', destination: 'contact' },
    ],
  },
  'development.hero': {
    eyebrow: 'Utah’s Premier Developer',
    heading: 'Transforming Vision Into',
    highlightedWord: 'Reality',
    description:
      'From raw land acquisition to finished communities, TriCo Development brings over 40 years of experience in residential and commercial development across Utah, Idaho, and Arizona.',
    primaryActionLabel: 'View Our Projects',
    secondaryActionLabel: 'Start Your Project',
  },
  'development.hero.stats': [
    {
      id: 'b712f822-19e5-5bcd-a72d-d247df5a04b9',
      icon: 'Map',
      value: '1000+',
      label: 'Acres Developed',
    },
    {
      id: 'b812f9b5-18e5-5a3a-a62d-d0b4de5a0326',
      icon: 'Building2',
      value: '50+',
      label: 'Projects Completed',
    },
    {
      id: 'b512f4fc-17e5-58a7-a92d-d56ddd5a0193',
      icon: 'Mountain',
      value: '3',
      label: 'States Served',
    },
  ],
  'development.land-experts.header': {
    eyebrow: 'Utah Land Specialists',
    heading: 'Your Land Experts',
    description:
      "With decades of experience in Utah's land market, we provide comprehensive expertise in buying, listing, and developing land across the state.",
  },
  'development.land-experts.services': [
    {
      id: '17682a88-25d5-5acd-a91c-44630f62bfa1',
      icon: 'MapPin',
      title: 'Land Buying',
      description:
        'Expert guidance in identifying and acquiring prime land opportunities across Utah. We help you find the perfect property for your vision.',
    },
    {
      id: '18682c1b-24d5-593a-a81c-42d00e62be0e',
      icon: 'FileText',
      title: 'Land Listing',
      description:
        'Strategic marketing and comprehensive listing services to maximize the value and exposure of your land investment.',
    },
    {
      id: '19682dae-23d5-57a7-ab1c-47890d62bc7b',
      icon: 'Building2',
      title: 'Land Development',
      description:
        'Full-service development expertise from concept to completion. We transform raw land into thriving residential and commercial communities.',
    },
  ],
  'development.land-experts.stats': [
    {
      id: '8cf77ff7-cd95-5e94-a387-5c027d647b48',
      icon: 'TrendingUp',
      value: '40+',
      label: 'Years Experience',
    },
    {
      id: '8bf77e64-ce95-5027-a487-5d957e647cdb',
      icon: 'MapPin',
      value: '1000+',
      label: 'Acres Transacted',
    },
    {
      id: '8ef7831d-cf95-51ba-a187-58dc7f647e6e',
      icon: 'Building2',
      value: '50+',
      label: 'Projects Developed',
    },
    {
      id: '8df7818a-d095-534d-a287-5a6f80648001',
      icon: 'Compass',
      value: '3',
      label: 'States Served',
    },
  ],
  'development.services.header': {
    eyebrow: 'Development Services',
    heading: 'Building Utah’s Future',
    description:
      'From raw land acquisition to finished communities, TriCo Development transforms vision into reality with over 40 years of experience in residential and commercial development.',
    projectsHeading: 'Our Projects',
    featuredHeading: 'Featured Developments',
  },
  'development.services.items': [
    {
      id: '70de7f95-bd52-55de-a491-9d78ebe65bda',
      icon: 'MapPin',
      title: 'Land Acquisition',
      description:
        'Expert guidance in identifying and acquiring prime land parcels for residential and commercial development.',
    },
    {
      id: '6fde7e02-be52-5771-a591-9f0bece65d6d',
      icon: 'Home',
      title: 'Residential Development',
      description:
        'End-to-end residential development from site selection and entitlement to construction oversight.',
    },
    {
      id: '6ede7c6f-bb52-52b8-a691-a09ee9e658b4',
      icon: 'Landmark',
      title: 'Commercial Development',
      description:
        'Strategic commercial development including feasibility studies, zoning navigation, and project management.',
    },
    {
      id: '6dde7adc-bc52-544b-a791-a231eae65a47',
      icon: 'Mountain',
      title: 'Land Development',
      description:
        'Raw land transformation including grading, utility installation, road infrastructure, and site preparation to ready parcels for vertical construction.',
    },
    {
      id: '6cde7949-c152-5c2a-a891-a3c4e7e6558e',
      icon: 'Building2',
      title: 'Storage Facility Development',
      description:
        'Specialized development of self-storage facilities from site selection and feasibility to build-out, tailored for long-term investment performance.',
    },
  ],
  'development.projects.categories': [
    {
      id: 'a7779ee9-7834-5b58-ae04-4c865be0747c',
      icon: 'Building2',
      title: 'Current Projects',
      count: '5 Active',
      description:
        'Explore our active development projects currently in progress across the region.',
      buttonLabel: 'View Current',
    },
    {
      id: 'a6779d56-7934-5ceb-af04-4e195ce0760f',
      icon: 'TrendingUp',
      title: 'Completed Projects',
      count: '40+ Completed',
      description:
        'See our portfolio of successfully completed residential and commercial developments.',
      buttonLabel: 'View Completed',
    },
  ],
  'development.projects.featured': [
    {
      id: '89e10b2f-3e84-5362-a583-46c476389dbe',
      image: managed('media/seed/real-estate-property-1.jpeg'),
      imageAltText: 'Modern Farmhouse',
      type: 'Residential Development',
      title: 'Modern Farmhouse',
      location: 'Utah',
    },
    {
      id: '88e1099c-3f84-54f5-a683-485777389f51',
      image: managed('media/seed/real-estate-property-2.jpeg'),
      imageAltText: 'Custom Home Build',
      type: 'Residential Development',
      title: 'Custom Home Build',
      location: 'Utah',
    },
  ],
  'development.partners.header': {
    eyebrow: 'Trusted Partnerships',
    heading: 'Builder & Investor Partners',
    description:
      'We collaborate with trusted builders and investors to bring exceptional projects to life.',
  },
  'development.partners.items': [
    { id: '1761914a-0b15-5811-abde-78af34643b3d', name: 'Builder Partner 1' },
    { id: '186192dd-0a15-567e-aade-771c336439aa', name: 'Builder Partner 2' },
    { id: '15618e24-0915-54eb-adde-7bd532643817', name: 'Investor Partner 1' },
    { id: '16618fb7-0815-5358-acde-7a4231643684', name: 'Investor Partner 2' },
    { id: '13618afe-0f15-5e5d-a7de-7263306434f1', name: 'Builder Partner 3' },
    { id: '14618c91-0e15-5cca-a6de-70d02f64335e', name: 'Investor Partner 3' },
  ],
  'development.partners.footer': {
    message: 'Interested in partnering with us?',
    actionLabel: 'Get in touch',
  },
  'development.team.header': {
    eyebrow: 'Our Team',
    heading: 'Development Team',
    description: "Meet the experienced professionals driving TriCo's development success.",
  },
  'development.team.members': [
    {
      id: '7e92964f-b923-50d8-a3b0-b7fe716418fc',
      name: 'Stephen Tripp',
      role: 'Founder & President',
      bio: "With over 40 years of experience in Utah real estate and development, Steve leads TriCo's vision for building thriving communities.",
      image: managed('media/seed/steve-tripp.png'),
      imageAltText: 'Stephen Tripp',
    },
    {
      id: '7d9294bc-ba23-526b-a4b0-b99172641a8f',
      name: 'Randy Rimmer',
      role: 'Vice President',
      bio: 'Randy brings decades of development and construction expertise, overseeing project execution and strategic growth.',
      image: managed('media/seed/randy-rimmer.png'),
      imageAltText: 'Randy Rimmer',
    },
    {
      id: '80929975-bb23-53fe-a1b0-b4d873641c22',
      name: 'Brooke Moore',
      role: 'Director',
      bio: 'Brooke oversees development operations and strategy, ensuring projects are delivered on time and to the highest standards.',
      image: managed('media/seed/brooke-moore.jpeg'),
      imageAltText: 'Brooke Moore',
    },
  ],
  'development.about': {
    eyebrow: 'About TriCo Development',
    heading: 'Building Communities Since 1984',
    introduction:
      "For over four decades, TriCo Development has been at the forefront of Utah's growth, transforming raw land into vibrant residential neighborhoods and successful commercial centers.",
    detail:
      "Our comprehensive approach combines deep local knowledge, strong contractor relationships, and a commitment to quality that has made us one of Utah's most trusted development partners.",
  },
  'development.about.highlights': [
    {
      id: '0bba8cff-ae46-5d40-a068-cda6f9e1ca94',
      value: '40+ years of development experience in Utah',
    },
    {
      id: '0aba8b6c-af46-5ed3-a168-cf39fae1cc27',
      value: 'Comprehensive services from land acquisition to completion',
    },
    {
      id: '0dba9025-b046-5066-ae68-ca80fbe1cdba',
      value: 'Strong relationships with municipalities and contractors',
    },
    {
      id: '0cba8e92-b146-51f9-af68-cc13fce1cf4d',
      value: 'Proven track record of successful residential and commercial projects',
    },
    {
      id: '07ba86b3-b246-538c-a468-d3f2f5e1c448',
      value: 'Serving Utah, Idaho, and Arizona markets',
    },
  ],
  'development.about.values': [
    {
      id: 'd44556d0-3d8a-5e27-a029-9f59aeb8556b',
      icon: 'Target',
      title: 'Vision-Driven',
      description:
        'We see potential where others see raw land, transforming vision into thriving communities.',
    },
    {
      id: 'd5455863-3c8a-5c94-af29-9dc6adb853d8',
      icon: 'Shield',
      title: 'Integrity',
      description:
        'Every project is built on a foundation of honesty, transparency, and ethical practices.',
    },
    {
      id: 'd64559f6-3f8b-514d-ae29-9c33b0b85891',
      icon: 'TrendingUp',
      title: 'Long-Term Value',
      description:
        'We develop with the future in mind, creating lasting value for communities and investors.',
    },
  ],
  'development.reviews.header': {
    eyebrow: 'We’d Love Your Feedback',
    heading: 'Leave Us a Review',
    description:
      'Your feedback helps us grow and lets others discover the TriCo difference. It only takes a minute — pick your favorite platform below.',
    unavailableLinkLabel: 'Review link coming soon',
    actionLabel: 'Review on',
  },
  'development.reviews.platforms': [
    {
      id: '19c26ba6-f2ab-52ab-a809-0209a4eab557',
      name: 'Google',
      description: 'Share your experience on Google Reviews — helps neighbors find us.',
      externalUrl: '',
    },
    {
      id: '1ac26d39-f1ab-5118-a709-0076a3eab3c4',
      name: 'Facebook',
      description: 'Recommend us on Facebook so your network can see it too.',
      externalUrl: '',
    },
    {
      id: '17c26880-f4ab-55d1-a608-fee3a6eab87d',
      name: 'Yelp',
      description: 'Leave a Yelp review to help others make an informed decision.',
      externalUrl: '',
    },
  ],
  'development.reviews.footer': {
    message: 'Prefer to share feedback privately? Email us at',
    email: 'Office@tricoinc.com',
    closingMessage: '— we read every message.',
  },
  'development.contact.header': {
    eyebrow: 'Contact Us',
    heading: 'Let’s Build Something Great Together',
    description:
      'Have land to develop or need the right development partner? Our team is ready to bring your vision to life.',
  },
  'development.contact.details': {
    locationLabel: 'Office Location',
    address: '194 West 12650 South Suite 100\nDraper, UT 84020',
    phoneLabel: 'Phone',
    phone: '(801) 571-8833',
    faxLabel: 'Fax',
    fax: '(801) 571-9888',
    emailLabel: 'Email',
    email: 'Office@tricoinc.com',
    officeHoursLabel: 'Office Hours',
    officeHours: 'Monday – Friday: 8am – 6pm\nSaturday: 9am – 1pm',
  },
  'development.footer.brand': {
    logo: managed('media/seed/trico-logo.png'),
    logoAltText: 'TriCo Development',
    divisionLabel: 'Development',
    description:
      'Utah’s trusted partner for land acquisition and residential and commercial development for over 40 years.',
    address: '194 W 12650 S Suite 100, Draper, UT 84020',
    phone: '(801) 571-8833',
    email: 'Office@tricoinc.com',
    linksHeading: 'Quick Links',
    serviceAreasHeading: 'Service Areas',
  },
  'development.footer.links': [
    {
      id: 'd16faaeb-8474-5d68-abcc-4816af12c3dc',
      label: 'Land Acquisition',
      destination: 'services',
    },
    {
      id: 'd06fa958-8574-5efb-accc-49a9b012c56f',
      label: 'Residential Development',
      destination: 'services',
    },
    {
      id: 'd36fae11-8674-508e-a9cc-44f0b112c702',
      label: 'Commercial Development',
      destination: 'projects',
    },
    {
      id: 'd26fac7e-8774-5221-aacc-4683b212c895',
      label: 'Current Projects',
      destination: 'projects',
    },
    { id: 'd56fb137-8874-53b4-afcc-4e62ab12bd90', label: 'Our Team', destination: 'team' },
    { id: 'd46fafa4-8974-5547-a0cc-4ff5ac12bf23', label: 'About Us', destination: 'about' },
    { id: 'd76fb45d-8a74-56da-adcc-4b3cad12c0b6', label: 'Contact', destination: 'contact' },
  ],
  'development.footer.service-areas': [
    { id: '96562e9e-6713-5399-a32e-e5f39fae3375', label: 'Utah' },
    { id: '97563031-6613-5206-a22e-e4609eae31e2', label: 'Idaho' },
    { id: '94562b78-6513-5073-a52e-e9199dae304f', label: 'Arizona' },
  ],
  'development.footer.legal': {
    organizationName: 'TriCo Development',
    rightsNotice: 'All rights reserved.',
  },
} as const satisfies Readonly<Record<`development.${string}`, EditableValue>>;

for (const definition of developmentEntityDefinitions) {
  definition.schema.parse(
    (developmentV2SeedData as Readonly<Record<string, EditableValue>>)[definition.id],
  );
}
