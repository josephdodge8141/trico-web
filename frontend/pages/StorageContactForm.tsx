import { Send } from 'lucide-react';
import { Alert } from '../components/ui/alert.js';
import { Button } from '../components/ui/button.js';
import { Field, FieldLabel } from '../components/ui/field.js';
import { Input } from '../components/ui/input.js';
import { Textarea } from '../components/ui/textarea.js';
import { useInquirySubmission } from '../hooks/useInquirySubmission.js';

export function StorageContactForm(): React.JSX.Element {
  const submission = useInquirySubmission();
  return (
    <form
      className="space-y-5"
      aria-label="Request a storage management consultation"
      onSubmit={(event) => {
        event.preventDefault();
        if (!event.currentTarget.reportValidity()) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        void submission.send(
          {
            kind: 'storage-consultation',
            name: `${String(data.get('firstName') ?? '')} ${String(data.get('lastName') ?? '')}`.trim(),
            email: String(data.get('email') ?? ''),
            phone: String(data.get('phone') ?? ''),
            facilityCount: String(data.get('facilityCount') ?? ''),
            message: String(data.get('message') ?? ''),
          },
          form,
        );
      }}
    >
      <h3 className="font-heading text-xl font-semibold">Request a Consultation</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="storage-first-name">First Name *</FieldLabel>
          <Input id="storage-first-name" name="firstName" required placeholder="John" />
        </Field>
        <Field>
          <FieldLabel htmlFor="storage-last-name">Last Name *</FieldLabel>
          <Input id="storage-last-name" name="lastName" required placeholder="Doe" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="storage-email">Email *</FieldLabel>
          <Input
            id="storage-email"
            name="email"
            type="email"
            required
            placeholder="john@example.com"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="storage-phone">Phone *</FieldLabel>
          <Input id="storage-phone" name="phone" type="tel" required placeholder="(555) 123-4567" />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="storage-facilities">Number of Facilities</FieldLabel>
        <Input id="storage-facilities" name="facilityCount" placeholder="e.g., 1, 2-5, 5+" />
      </Field>
      <Field>
        <FieldLabel htmlFor="storage-message">Tell Us About Your Facilities</FieldLabel>
        <Textarea
          id="storage-message"
          name="message"
          rows={4}
          placeholder="Share details about your storage facilities and management needs..."
        />
      </Field>
      <Button className="w-full" type="submit" disabled={submission.status === 'sending'}>
        {submission.status === 'sending' ? 'Sending…' : 'Get Started'} <Send aria-hidden="true" />
      </Button>
      {submission.status === 'error' ? (
        <Alert ref={submission.feedbackRef} role="alert" tabIndex={-1} variant="destructive">
          We could not send your inquiry. Please try again.
        </Alert>
      ) : null}
      {submission.status === 'sent' ? (
        <Alert ref={submission.feedbackRef} role="status" tabIndex={-1}>
          Thank you for your inquiry! A storage management specialist will contact you within 24
          hours.
        </Alert>
      ) : null}
    </form>
  );
}
