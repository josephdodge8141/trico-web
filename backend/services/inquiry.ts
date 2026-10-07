import type { InquiryKind, InquiryRequest } from '@app/schemas';

import type { MailConnection } from '../config/connections.js';
import { ServiceError } from './errors.js';

const subjects: Readonly<Record<InquiryKind, string>> = {
  'property-new-client': 'Property management client inquiry',
  'property-analysis': 'Property management analysis request',
  'real-estate-new-client': 'Real estate client inquiry',
  'real-estate-contact': 'Real estate contact request',
  'construction-bid': 'Construction bid request',
  'construction-contact': 'Construction contact request',
  'storage-consultation': 'Storage management consultation request',
  'development-contact': 'Development project inquiry',
};

const details: readonly (readonly [key: keyof InquiryRequest, label: string])[] = [
  ['phone', 'Phone'],
  ['company', 'Company'],
  ['interest', 'Interest'],
  ['propertyAddress', 'Property address'],
  ['propertyType', 'Property or project type'],
  ['location', 'Location'],
  ['facilityCount', 'Number of facilities'],
  ['message', 'Message'],
];

export interface InquiryService {
  submit(input: InquiryRequest): Promise<void>;
}

export function createInquiryService(
  mail: MailConnection,
  recipient: string | undefined,
): InquiryService {
  return {
    submit: async (input): Promise<void> => {
      if (recipient === undefined) {
        throw new ServiceError('INQUIRY_UNCONFIGURED', 'Inquiry delivery is unavailable');
      }
      const text = [
        `Name: ${input.name}`,
        `Email: ${input.email}`,
        ...details.flatMap(([key, label]) => {
          const value = input[key];
          return typeof value === 'string' && value.trim() !== '' ? [`${label}: ${value}`] : [];
        }),
      ].join('\n');
      try {
        await mail.send({ to: recipient, subject: subjects[input.kind], text });
      } catch {
        throw new ServiceError(
          'INQUIRY_DELIVERY_FAILED',
          'Inquiry delivery failed. Please try again.',
        );
      }
    },
  };
}
