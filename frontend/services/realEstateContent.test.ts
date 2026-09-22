import assert from 'node:assert/strict';
import test from 'node:test';
import {
  realEstateHeroSchema,
  realEstateEntityDefinitions,
  realEstateListingsActionsSchema,
  realEstateListingsItemsSchema,
  realEstateV2SeedData,
} from '@app/schemas';
import {
  mergeFilteredRealEstateCollection,
  parseRealEstateValue,
} from '../pages/realEstateContent.js';

test('Real Estate service seed preserves the complete legacy-visible descriptions', () => {
  assert.deepEqual(
    realEstateV2SeedData['real-estate.services.items'].map(({ description }) => description),
    [
      'Full-service commercial brokerage including office, retail, industrial, and investment properties. We handle sales, leasing, and acquisitions across all commercial property types.',
      'Expert guidance in buying and selling land for residential subdivisions, commercial development, and investment opportunities throughout Utah.',
      'Comprehensive commercial leasing services including market analysis, property showings, tenant screening, and lease negotiation for landlords and tenants.',
      'Build your dream home in one of our developed subdivisions or custom build on a specific lot. We manage the entire process from design to move-in.',
      "Full residential brokerage services for buyers and sellers. Whether you're purchasing your first home or selling a property, our team provides expert guidance.",
    ],
  );
});

test('Real Estate listing process and FAQ seeds preserve strict mounted semantics', () => {
  const listings = realEstateV2SeedData['real-estate.listings.items'];
  assert.deepEqual(
    listings.slice(0, 5).map(({ mlsNumber }) => mlsNumber),
    ['2019235', '2019250', '2019286', '', ''],
  );
  assert.equal(
    realEstateListingsItemsSchema.safeParse([
      { ...listings[0], unsupportedListingField: 'not allowed' },
    ]).success,
    false,
  );
  const listingDefinition = realEstateEntityDefinitions.find(
    ({ id }) => id === 'real-estate.listings.items',
  );
  assert.equal(listingDefinition?.editor.kind, 'list');
  assert.equal(
    listingDefinition?.editor.kind === 'list'
      ? listingDefinition.editor.groups.some(({ fields }) =>
          fields.some(({ path }) => path.join('.') === 'mlsNumber'),
        )
      : false,
    true,
  );
  assert.deepEqual(
    realEstateV2SeedData['real-estate.process.steps'].map(({ description }) => description),
    [
      'We begin by understanding your goals, timeline, and budget to create a customized strategy that aligns with your real estate objectives.',
      'Our team conducts thorough market research and property evaluations to identify opportunities and ensure informed decision-making.',
      'Leveraging decades of experience, we negotiate the best terms and guide you through every step of the transaction process.',
      'We coordinate all closing details, ensuring a smooth transfer of ownership with attention to every legal and financial requirement.',
      "Our relationship doesn't end at closing. We provide continued support, market updates, and guidance for your future real estate needs.",
    ],
  );
  assert.equal(
    realEstateV2SeedData['real-estate.faq.header'].description,
    'Find answers to frequently asked questions about our real estate services and process.',
  );
  assert.equal(
    new Set(realEstateV2SeedData['real-estate.faq.items'].map(({ answer }) => answer)).size,
    6,
  );
});

test('Real Estate supporting seeds preserve the complete mounted semantic content', () => {
  assert.deepEqual(
    [
      realEstateV2SeedData['real-estate.about'].introduction,
      realEstateV2SeedData['real-estate.about'].detail,
    ],
    [
      "TriCo Real Estate is a full-service brokerage specializing in commercial real estate and land, while also serving residential clients. For over four decades, we've helped investors, businesses, homeowners, and developers navigate Utah's property market with confidence.",
      'From commercial sales and leasing to land acquisitions, new construction homes in our subdivisions or custom builds on your lot, and traditional residential transactions — our experienced team delivers results across every property type.',
    ],
  );
  assert.equal(
    realEstateV2SeedData['real-estate.careers'].benefits.at(-1)?.label,
    '40+ years of market reputation',
  );
  assert.deepEqual(
    realEstateV2SeedData['real-estate.reviews.platforms'].map(({ description }) => description),
    [
      'Share your experience on Google Reviews — helps neighbors find us.',
      'Recommend us on Facebook so your network can see it too.',
      'Leave a Yelp review to help others make an informed decision.',
    ],
  );
});

test('Real Estate uses semantic seed values when content is absent or legacy', () => {
  assert.deepEqual(
    parseRealEstateValue({}, 'real-estate.hero', realEstateHeroSchema),
    realEstateV2SeedData['real-estate.hero'],
  );
  assert.deepEqual(
    parseRealEstateValue(
      { 'real-estate.hero': { content: ['legacy'], media: [], externalUrls: [] } },
      'real-estate.hero',
      realEstateHeroSchema,
    ),
    realEstateV2SeedData['real-estate.hero'],
  );
  assert.deepEqual(
    parseRealEstateValue(
      {
        'real-estate.listings.actions': {
          activeLabel: 'Active Listings',
          soldLabel: 'Sold',
        },
      },
      'real-estate.listings.actions',
      realEstateListingsActionsSchema,
    ),
    realEstateV2SeedData['real-estate.listings.actions'],
  );
});
test('Real Estate renders a saved object replacement from private preview content', () => {
  const hero = {
    ...realEstateV2SeedData['real-estate.hero'],
    heading: 'A newly saved real estate headline',
  };
  const parsed = parseRealEstateValue(
    { 'real-estate.hero': hero },
    'real-estate.hero',
    realEstateHeroSchema,
  );
  assert.equal(parsed.heading, 'A newly saved real estate headline');
});
test('Real Estate renders saved list-item replacements from private preview content', () => {
  const listings = realEstateV2SeedData['real-estate.listings.items'].map((listing, index) =>
    index === 0 ? { ...listing, address: 'Edited listing address' } : listing,
  );
  const parsed = parseRealEstateValue(
    { 'real-estate.listings.items': listings },
    'real-estate.listings.items',
    realEstateListingsItemsSchema,
  );
  assert.equal(parsed[0]?.address, 'Edited listing address');
});
test('Real Estate rejects malformed semantic preview data', () => {
  assert.throws(() =>
    parseRealEstateValue(
      { 'real-estate.hero': { heading: 'Incomplete' } },
      'real-estate.hero',
      realEstateHeroSchema,
    ),
  );
});

test('Real Estate recognizes every known version-one list shape', () => {
  const legacyCases = [
    [
      'real-estate.process.steps',
      realEstateV2SeedData['real-estate.process.steps'],
      [{ id: crypto.randomUUID(), number: '01', icon: 'Search', title: 'Old', description: 'Old' }],
    ],
    [
      'real-estate.about.features',
      realEstateV2SeedData['real-estate.about.features'],
      [{ id: crypto.randomUUID(), value: 'Old feature' }],
    ],
    [
      'real-estate.testimonials.items',
      realEstateV2SeedData['real-estate.testimonials.items'],
      [{ id: crypto.randomUUID(), name: 'Old', role: 'Client', content: 'Old quote', rating: 5 }],
    ],
  ] as const;
  for (const [id, expected, legacy] of legacyCases) {
    const definition = realEstateEntityDefinitions.find((candidate) => candidate.id === id);
    assert.notEqual(definition, undefined);
    assert.deepEqual(parseRealEstateValue({ [id]: legacy }, id, definition!.schema), expected);
  }
});

test('Real Estate tab edits preserve and do not reorder records in the other tab', () => {
  const listings = realEstateV2SeedData['real-estate.listings.items'];
  const active = listings.filter(({ status }) => status === 'active');
  const sold = listings.filter(({ status }) => status === 'sold');
  const reordered = [...active].reverse();
  const merged = mergeFilteredRealEstateCollection(
    listings,
    reordered,
    ({ status }) => status === 'active',
  );
  assert.deepEqual(
    merged.filter(({ status }) => status === 'active'),
    reordered,
  );
  assert.deepEqual(
    merged.filter(({ status }) => status === 'sold'),
    sold,
  );
});
