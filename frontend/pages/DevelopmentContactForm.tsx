import type { FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Alert } from '../components/ui/alert.js';
import { Button } from '../components/ui/button.js';
import { Field, FieldLabel } from '../components/ui/field.js';
import { Input } from '../components/ui/input.js';
import { Textarea } from '../components/ui/textarea.js';
import { useInquirySubmission } from '../hooks/useInquirySubmission.js';

export function DevelopmentContactForm(): React.JSX.Element {
  const submission = useInquirySubmission();
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void submission.send(
      {
        kind: 'development-contact',
        name: `${String(data.get('firstName') ?? '')} ${String(data.get('lastName') ?? '')}`.trim(),
        email: String(data.get('email') ?? ''),
        phone: String(data.get('phone') ?? ''),
        propertyType: String(data.get('projectType') ?? ''),
        message: String(data.get('message') ?? ''),
      },
      form,
    );
  };
  if (submission.status === 'sent') {
    return (
      <Alert ref={submission.feedbackRef} role="status" tabIndex={-1} className="space-y-2">
        <CheckCircle2 className="size-5" aria-hidden="true" />
        <h3 className="font-heading text-lg font-semibold">Thank you for your inquiry!</h3>
        <p>A development specialist will contact you within 24 hours.</p>
      </Alert>
    );
  }
  return (
    <div className="space-y-5">
      <h3 className="font-heading text-xl font-semibold">Start Your Development Project</h3>
      <form className="space-y-5" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="development-first-name">First Name *</FieldLabel>
            <Input id="development-first-name" name="firstName" required placeholder="John" />
          </Field>
          <Field>
            <FieldLabel htmlFor="development-last-name">Last Name *</FieldLabel>
            <Input id="development-last-name" name="lastName" required placeholder="Doe" />
          </Field>
          <Field>
            <FieldLabel htmlFor="development-email">Email *</FieldLabel>
            <Input
              id="development-email"
              name="email"
              type="email"
              required
              placeholder="john@example.com"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="development-phone">Phone *</FieldLabel>
            <Input
              id="development-phone"
              name="phone"
              type="tel"
              required
              placeholder="(555) 123-4567"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="development-project-type">Project Type</FieldLabel>
          <Input
            id="development-project-type"
            name="projectType"
            placeholder="Residential, Commercial, Mixed-Use"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="development-message">Tell Us About Your Project</FieldLabel>
          <Textarea
            id="development-message"
            name="message"
            rows={4}
            placeholder="Share details about your development vision…"
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
      </form>
    </div>
  );
}
