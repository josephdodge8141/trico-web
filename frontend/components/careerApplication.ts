export type CareerDivision =
  | 'Real Estate'
  | 'Property Management'
  | 'Construction'
  | 'Storage Management'
  | 'Development'
  | 'Corporate'
  | 'Other / General';

export const careerDivisions = [
  'Real Estate',
  'Property Management',
  'Construction',
  'Storage Management',
  'Development',
  'Corporate',
  'Other / General',
] as const satisfies readonly CareerDivision[];
