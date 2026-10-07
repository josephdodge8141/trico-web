import {
  careerApplicationRequestSchema,
  careerApplicationResponseSchema,
  careerApplicationUploadRequestSchema,
  careerApplicationUploadResponseSchema,
  errorResponseSchema,
  type CareerApplicationRequest,
  type CareerApplicationResponse,
} from '@app/schemas';

type ApplicationFields = Omit<CareerApplicationRequest, 'uploadId'>;

const contentTypeFor = (name: string): string => {
  if (/\.pdf$/i.test(name)) return 'application/pdf';
  if (/\.docx$/i.test(name))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/msword';
};

const errorMessage = async (response: Response, fallback: string): Promise<string> => {
  const body = errorResponseSchema.safeParse(await response.json().catch(() => undefined));
  return body.success ? body.data.error.message : fallback;
};

export async function submitCareerApplication(
  fields: ApplicationFields,
  resume: File,
): Promise<CareerApplicationResponse> {
  const uploadRequest = careerApplicationUploadRequestSchema.parse({
    resumeName: resume.name,
    resumeContentType: contentTypeFor(resume.name),
    contentLength: resume.size,
  });
  const reservationResponse = await fetch('/api/v1/applications/uploads', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(uploadRequest),
  });
  if (!reservationResponse.ok) {
    throw new Error(
      await errorMessage(
        reservationResponse,
        `Resume upload failed (${reservationResponse.status})`,
      ),
    );
  }
  const reservation = careerApplicationUploadResponseSchema.parse(await reservationResponse.json());
  const signedUrl = new URL(reservation.uploadUrl);
  const localObjectHost = ['minio', 'localhost', '127.0.0.1'].includes(signedUrl.hostname);
  const uploadUrl = localObjectHost
    ? `${window.location.origin}/__objects${signedUrl.pathname}${signedUrl.search}`
    : reservation.uploadUrl;
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: resume,
    headers: { 'Content-Type': uploadRequest.resumeContentType },
  });
  if (!uploadResponse.ok) {
    throw new Error('Resume upload failed. Please try again.');
  }
  const payload = careerApplicationRequestSchema.parse({
    ...fields,
    uploadId: reservation.uploadId,
  });
  const response = await fetch('/api/v1/applications', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, `Application failed (${response.status})`));
  }
  return careerApplicationResponseSchema.parse(await response.json());
}
