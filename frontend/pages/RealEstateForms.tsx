import type { FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';

import { SelectField } from '../components/SelectField.js';
import { Alert } from '../components/ui/alert.js';
import { Button } from '../components/ui/button.js';
import { Card, CardContent } from '../components/ui/card.js';
import { Field, FieldLabel } from '../components/ui/field.js';
import { Input } from '../components/ui/input.js';
import { Textarea } from '../components/ui/textarea.js';
import { useInquirySubmission } from '../hooks/useInquirySubmission.js';

export function RealEstateContactForm(): React.JSX.Element {
  const submission = useInquirySubmission();
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void submission.send(
      {
        kind: 'real-estate-contact',
        name: `${String(data.get('firstName') ?? '')} ${String(data.get('lastName') ?? '')}`.trim(),
        email: String(data.get('email') ?? ''),
        phone: String(data.get('phone') ?? ''),
        interest: String(data.get('interest') ?? ''),
        message: String(data.get('message') ?? ''),
      },
      form,
    );
  };
  if (submission.status === 'sent')
    return (
      <Alert
        ref={submission.feedbackRef}
        role="status"
        tabIndex={-1}
        className="flex items-start gap-3"
      >
        <CheckCircle2 aria-hidden="true" />
        <span>
          <strong>Thank you for your inquiry!</strong> A real estate specialist will contact you
          within 24 hours.
        </span>
      </Alert>
    );
  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <h3 className="font-heading text-xl font-semibold">Start Your Real Estate Journey</h3>
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="real-estate-first-name">First Name *</FieldLabel>
              <Input id="real-estate-first-name" name="firstName" required placeholder="John" />
            </Field>
            <Field>
              <FieldLabel htmlFor="real-estate-last-name">Last Name *</FieldLabel>
              <Input id="real-estate-last-name" name="lastName" required placeholder="Doe" />
            </Field>
            <Field>
              <FieldLabel htmlFor="real-estate-email">Email *</FieldLabel>
              <Input
                id="real-estate-email"
                name="email"
                type="email"
                required
                placeholder="john@example.com"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="real-estate-phone">Phone *</FieldLabel>
              <Input
                id="real-estate-phone"
                name="phone"
                type="tel"
                required
                placeholder="(555) 123-4567"
              />
            </Field>
          </div>
          <SelectField
            id="real-estate-contact-interest"
            name="interest"
            label="I’m interested in *"
            placeholder="Select an option"
            required
            options={[
              'Buying a home',
              'Selling a property',
              'Land / acreage',
              'Commercial property',
              'Investment property',
              'Other',
            ].map((option) => ({ value: option, label: option }))}
          />
          <Field>
            <FieldLabel htmlFor="real-estate-contact-message">Tell Us About Your Goals</FieldLabel>
            <Textarea
              id="real-estate-contact-message"
              name="message"
              rows={4}
              placeholder="Share details about your real estate needs…"
            />
          </Field>
          <Button className="w-full" type="submit" disabled={submission.status === 'sending'}>
            {submission.status === 'sending' ? 'Sending…' : 'Get Started'}{' '}
            <Send aria-hidden="true" />
          </Button>
          {submission.status === 'error' ? (
            <Alert ref={submission.feedbackRef} role="alert" tabIndex={-1} variant="destructive">
              We could not send your inquiry. Please try again.
            </Alert>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
