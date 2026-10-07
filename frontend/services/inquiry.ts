import {
  errorResponseSchema,
  inquiryRequestSchema,
  inquiryResponseSchema,
  type InquiryRequest,
  type InquiryResponse,
} from '@app/schemas';

export async function submitInquiry(input: InquiryRequest): Promise<InquiryResponse> {
  const response = await fetch('/api/v1/inquiries', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(inquiryRequestSchema.parse(input)),
  });
  if (!response.ok) {
    const body = errorResponseSchema.safeParse(await response.json().catch(() => undefined));
    throw new Error(body.success ? body.data.error.message : `Inquiry failed (${response.status})`);
  }
  return inquiryResponseSchema.parse(await response.json());
}
