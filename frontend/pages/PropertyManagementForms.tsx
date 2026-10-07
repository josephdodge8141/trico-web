import { useState, type FormEvent } from 'react';

import { SelectField } from '../components/SelectField.js';
import { Alert } from '../components/ui/alert.js';
import { Button } from '../components/ui/button.js';
import { Field, FieldError, FieldLabel } from '../components/ui/field.js';
import { Input } from '../components/ui/input.js';
import { Textarea } from '../components/ui/textarea.js';
import { useInquirySubmission } from '../hooks/useInquirySubmission.js';

type FormErrors = Readonly<Record<string, string>>;

const required = (data: FormData, name: string, label: string): string | undefined => {
  const value = data.get(name);
  return typeof value !== 'string' || value.trim() === ''
    ? `Enter ${label.toLowerCase()}.`
    : undefined;
};

function errorsFor(data: FormData, fields: readonly [string, string][]): FormErrors {
  const errors = Object.fromEntries(
    fields.flatMap(([name, label]) => {
      const message = required(data, name, label);
      return message === undefined ? [] : [[name, message]];
    }),
  );
  const email = data.get('email');
  return typeof email === 'string' && email.trim() !== '' && !/^\S+@\S+\.\S+$/.test(email)
    ? { ...errors, email: 'Enter a valid email address.' }
    : errors;
}

function TextField({
  form,
  name,
  label,
  errors,
  type = 'text',
  maxLength,
  placeholder,
}: {
  readonly form: string;
  readonly name: string;
  readonly label: string;
  readonly errors: FormErrors;
  readonly type?: string;
  readonly maxLength?: number;
  readonly placeholder?: string;
}): React.JSX.Element {
  const message = errors[name];
  const id = `${form}-${name}`;
  return (
    <Field data-invalid={message === undefined ? undefined : 'true'}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={message === undefined ? undefined : true}
        aria-describedby={message === undefined ? undefined : `${id}-error`}
      />
      {message === undefined ? null : <FieldError id={`${id}-error`}>{message}</FieldError>}
    </Field>
  );
}

export function PropertyManagementAnalysisForm(): React.JSX.Element {
  const [errors, setErrors] = useState<FormErrors>({});
  const submission = useInquirySubmission();
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const next = errorsFor(data, [
      ['firstName', 'First name'],
      ['lastName', 'Last name'],
      ['email', 'Email'],
      ['phone', 'Phone'],
      ['interest', 'Area of interest'],
    ]);
    setErrors(next);
    if (Object.keys(next).length === 0) {
      void submission.send(
        {
          kind: 'property-analysis',
          name: `${String(data.get('firstName') ?? '')} ${String(data.get('lastName') ?? '')}`.trim(),
          email: String(data.get('email') ?? ''),
          phone: String(data.get('phone') ?? ''),
          interest: String(data.get('interest') ?? ''),
          message: String(data.get('message') ?? ''),
        },
        form,
      );
    }
  };
  return (
    <div className="space-y-5">
      <h3 className="font-heading text-xl font-semibold">Request Your Free Analysis</h3>
      {submission.status === 'sent' ? (
        <Alert ref={submission.feedbackRef} role="status" tabIndex={-1} className="space-y-3">
          <strong className="block">Thank you for your inquiry!</strong>
          <p>We'll be in touch within 24 hours.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              submission.reset();
              window.requestAnimationFrame(() =>
                document.getElementById('pm-analysis-firstName')?.focus(),
              );
            }}
          >
            Send another request
          </Button>
        </Alert>
      ) : (
        <form
          className="space-y-5"
          aria-label="Free property analysis"
          noValidate
          onSubmit={submit}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              form="pm-analysis"
              name="firstName"
              label="First Name *"
              errors={errors}
              placeholder="John"
            />
            <TextField
              form="pm-analysis"
              name="lastName"
              label="Last Name *"
              errors={errors}
              placeholder="Doe"
            />
            <TextField
              form="pm-analysis"
              name="email"
              label="Email *"
              errors={errors}
              type="email"
              placeholder="john@example.com"
            />
            <TextField
              form="pm-analysis"
              name="phone"
              label="Phone *"
              errors={errors}
              type="tel"
              placeholder="(555) 123-4567"
            />
          </div>
          <SelectField
            id="property-management-interest"
            name="interest"
            label="I'm interested in *"
            placeholder="Select an option"
            required
            options={[
              'Single-family rental',
              'Multi-family / apartments',
              'Commercial property',
              'HOA / COA management',
              'Storage facility',
              'Other',
            ].map((option) => ({ value: option, label: option }))}
            error={errors.interest}
            onValueChange={() =>
              setErrors((current) => {
                const next = { ...current };
                delete next.interest;
                return next;
              })
            }
          />
          <Field>
            <FieldLabel htmlFor="pm-analysis-message">How Can We Help?</FieldLabel>
            <Textarea
              id="pm-analysis-message"
              name="message"
              rows={4}
              placeholder="Tell us about your property and what you're looking for..."
            />
          </Field>
          <Button className="w-full" type="submit" disabled={submission.status === 'sending'}>
            {submission.status === 'sending' ? 'Sending…' : 'Get Free Analysis'}
          </Button>
          {submission.status === 'error' ? (
            <Alert ref={submission.feedbackRef} role="alert" tabIndex={-1} variant="destructive">
              We could not send your inquiry. Please try again.
            </Alert>
          ) : null}
        </form>
      )}
    </div>
  );
}
