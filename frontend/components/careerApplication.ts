import { careerDivisionSchema, type CareerDivision } from '@app/schemas';

export type { CareerDivision };
export const careerDivisions: readonly CareerDivision[] = careerDivisionSchema.options;
