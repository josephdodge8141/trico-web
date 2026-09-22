export interface CareersNavigationLink {
  readonly id: string;
  readonly label: string;
  readonly destination: string;
}

const fallbackCareersLink: CareersNavigationLink = {
  id: 'd971a9cf-9a16-55f4-929f-62b51d9e3b89',
  label: 'Careers',
  destination: 'careers',
};

/**
 * Keeps existing published page documents forward-compatible with the shared Careers section.
 * New publications contain this link in their page seed; older documents receive it at render time.
 */
export function navigationWithCareers(
  links: readonly CareersNavigationLink[],
): readonly CareersNavigationLink[] {
  return links.some(({ destination }) => destination === 'careers')
    ? links
    : [...links, fallbackCareersLink];
}
