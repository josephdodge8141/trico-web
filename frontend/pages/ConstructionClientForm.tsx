import { ArrowRight, Mail, Phone } from 'lucide-react';

import { SelectField } from '../components/SelectField.js';
import { Alert } from '../components/ui/alert.js';
import { Button } from '../components/ui/button.js';
import { Field, FieldLabel } from '../components/ui/field.js';
import { Input } from '../components/ui/input.js';
import { Textarea } from '../components/ui/textarea.js';
import { useInquirySubmission } from '../hooks/useInquirySubmission.js';

export function ConstructionClientForm({
  phone = '',
  email = '',
}: {
  readonly phone?: string;
  readonly email?: string;
}): React.JSX.Element {
  const submission = useInquirySubmission();
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        void submission.send(
          {
            kind: 'construction-bid',
            name: String(data.get('firstName') ?? ''),
            company: String(data.get('lastName') ?? ''),
            email: String(data.get('email') ?? ''),
            phone: String(data.get('phone') ?? ''),
            location: String(data.get('location') ?? ''),
            propertyType: String(data.get('projectType') ?? ''),
            message: String(data.get('message') ?? ''),
          },
          form,
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="bid-first-name">Your Name *</FieldLabel>
          <Input id="bid-first-name" required name="firstName" placeholder="John Smith" />
        </Field>
        <Field>
          <FieldLabel htmlFor="bid-last-name">Company Name</FieldLabel>
          <Input id="bid-last-name" name="lastName" placeholder="ABC Development LLC" />
        </Field>
        <Field>
          <FieldLabel htmlFor="bid-email">Email *</FieldLabel>
          <Input id="bid-email" required type="email" name="email" placeholder="john@example.com" />
        </Field>
        <Field>
          <FieldLabel htmlFor="bid-phone">Phone *</FieldLabel>
          <Input id="bid-phone" required type="tel" name="phone" placeholder="(801) 555-1234" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="bid-location">Project Location *</FieldLabel>
          <Input id="bid-location" required name="location" placeholder="City, State" />
        </Field>
        <SelectField
          id="construction-project-type"
          name="projectType"
          label="Project Type *"
          placeholder="Select project type..."
          required
          options={[
            'Concrete Work',
            'Multi-Housing Development',
            'Underground Utilities',
            'Excavation',
            'Office Construction/Remodel',
            'Storage Facility',
            'Other',
          ].map((option) => ({ value: option, label: option }))}
        />
      </div>
      <Field>
        <FieldLabel htmlFor="bid-message">Project Description *</FieldLabel>
        <Textarea
          id="bid-message"
          required
          name="message"
          rows={5}
          placeholder="Tell us about your construction project..."
        />
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={submission.status === 'sending'}>
          {submission.status === 'sending' ? 'Sending…' : 'Request Your Bid'}{' '}
          <ArrowRight aria-hidden="true" />
        </Button>
        <div className="flex flex-wrap gap-4 text-sm">
          <a
            className="flex items-center gap-1 text-primary hover:underline"
            href={`tel:${phone.replace(/[^\d+]/g, '')}`}
          >
            <Phone className="size-4" aria-hidden="true" /> {phone}
          </a>
          <a
            className="flex items-center gap-1 text-primary hover:underline"
            href={`mailto:${email}`}
          >
            <Mail className="size-4" aria-hidden="true" /> Email Us
          </a>
        </div>
      </div>
      {submission.status === 'error' ? (
        <Alert ref={submission.feedbackRef} role="alert" tabIndex={-1} variant="destructive">
          We could not send your inquiry. Please try again.
        </Alert>
      ) : null}
      {submission.status === 'sent' ? (
        <Alert ref={submission.feedbackRef} role="status" tabIndex={-1}>
          Thank you. A construction specialist will contact you soon.
        </Alert>
      ) : null}
    </form>
  );
}
