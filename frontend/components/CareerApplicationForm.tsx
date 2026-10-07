import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Send, Upload } from 'lucide-react';
import { careerDivisionSchema } from '@app/schemas';
import { submitCareerApplication } from '../services/career-application.js';

import { SelectField } from './SelectField.js';
import { careerDivisions, type CareerDivision } from './careerApplication.js';
import { Alert } from './ui/alert.js';
import { Button } from './ui/button.js';
import { Field, FieldDescription, FieldError, FieldLabel } from './ui/field.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';

interface ResumeFormValue {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly division: string;
  readonly position: string;
  readonly message: string;
  readonly resumeName: string;
}

const emptyForm: ResumeFormValue = {
  name: '',
  email: '',
  phone: '',
  division: '',
  position: '',
  message: '',
  resumeName: '',
};

type FormField = keyof ResumeFormValue;
type FormErrors = Readonly<Partial<Record<FormField, string>>>;

function validate(value: ResumeFormValue): FormErrors {
  const errors: Partial<Record<FormField, string>> = {};
  if (value.name.trim() === '') errors.name = 'Please enter your name.';
  if (value.email.trim() === '') errors.email = 'Please enter your email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim()))
    errors.email = 'Please enter a valid email address.';
  if (value.phone !== '' && !/^[\d\s()+-]{7,20}$/.test(value.phone))
    errors.phone = 'Please enter a valid phone number.';
  if (value.division === '') errors.division = 'Please select a division.';
  if (value.resumeName === '') errors.resumeName = 'Please attach your resume.';
  return errors;
}

export function CareerApplicationForm({
  initialDivision = '',
  initialPosition = '',
}: {
  readonly initialDivision?: CareerDivision | '';
  readonly initialPosition?: string;
}): React.JSX.Element {
  const [value, setValue] = useState<ResumeFormValue>(() => ({
    ...emptyForm,
    division: initialDivision,
    position: initialPosition,
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submittedName, setSubmittedName] = useState<string>();
  const [resume, setResume] = useState<File>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue((current) => ({
      ...current,
      division: initialDivision,
      position: initialPosition,
    }));
    setErrors({});
    setSubmitError(undefined);
  }, [initialDivision, initialPosition]);

  useEffect(() => {
    if (submittedName !== undefined || submitError !== undefined) feedbackRef.current?.focus();
  }, [submittedName, submitError]);

  const update = (field: FormField, nextValue: string): void => {
    setValue((current) => ({ ...current, [field]: nextValue }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const selectFile = (file: File | undefined): void => {
    setResume(undefined);
    update('resumeName', '');
    if (file === undefined) return;
    if (!/\.(?:pdf|doc|docx)$/i.test(file.name)) {
      setErrors((current) => ({
        ...current,
        resumeName: 'Resume must be a PDF or Word document.',
      }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((current) => ({ ...current, resumeName: 'File must be under 10MB.' }));
      return;
    }
    setResume(file);
    update('resumeName', file.name);
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = validate(value);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || resume === undefined) {
      const firstInvalid = (
        [
          ['name', 'career-name'],
          ['email', 'career-email'],
          ['phone', 'career-phone'],
          ['division', 'career-application-division'],
          ['resumeName', 'career-resume'],
        ] as const
      ).find(([field]) => nextErrors[field] !== undefined);
      if (firstInvalid !== undefined)
        window.requestAnimationFrame(() => document.getElementById(firstInvalid[1])?.focus());
      return;
    }
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      await submitCareerApplication(
        {
          name: value.name.trim(),
          email: value.email.trim(),
          phone: value.phone.trim(),
          division: careerDivisionSchema.parse(value.division),
          position: value.position.trim(),
          message: value.message.trim(),
          website: '',
        },
        resume,
      );
      setSubmittedName(value.name.trim().split(/\s+/)[0] ?? value.name.trim());
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : 'Application delivery failed. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedName !== undefined) {
    return (
      <Alert ref={feedbackRef} role="status" tabIndex={-1} className="space-y-3 p-5">
        <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
        <h4 className="font-heading text-xl font-semibold">Thank you, {submittedName}!</h4>
        <p>Your application and resume were delivered.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setValue(emptyForm);
            setResume(undefined);
            setSubmittedName(undefined);
            setErrors({});
            setSubmitError(undefined);
            window.requestAnimationFrame(() => document.getElementById('career-name')?.focus());
          }}
        >
          Submit another
        </Button>
      </Alert>
    );
  }

  return (
    <form className="space-y-5" id="career-application-form" noValidate onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="career-name">Full Name *</FieldLabel>
          <Input
            id="career-name"
            name="name"
            autoComplete="name"
            maxLength={100}
            placeholder="Jane Doe"
            value={value.name}
            onChange={(event) => update('name', event.target.value)}
            aria-invalid={errors.name === undefined ? undefined : true}
            aria-describedby={errors.name === undefined ? undefined : 'career-name-error'}
          />
          {errors.name === undefined ? null : (
            <FieldError id="career-name-error">{errors.name}</FieldError>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="career-email">Email *</FieldLabel>
          <Input
            id="career-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={255}
            placeholder="jane@example.com"
            value={value.email}
            onChange={(event) => update('email', event.target.value)}
            aria-invalid={errors.email === undefined ? undefined : true}
            aria-describedby={errors.email === undefined ? undefined : 'career-email-error'}
          />
          {errors.email === undefined ? null : (
            <FieldError id="career-email-error">{errors.email}</FieldError>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="career-phone">Phone</FieldLabel>
          <Input
            id="career-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={20}
            placeholder="(801) 555-0100"
            value={value.phone}
            onChange={(event) => update('phone', event.target.value)}
            aria-invalid={errors.phone === undefined ? undefined : true}
            aria-describedby={errors.phone === undefined ? undefined : 'career-phone-error'}
          />
          {errors.phone === undefined ? null : (
            <FieldError id="career-phone-error">{errors.phone}</FieldError>
          )}
        </Field>
        <SelectField
          id="career-application-division"
          name="division"
          label="Division of Interest *"
          placeholder="Select a division"
          options={careerDivisions.map((division) => ({ value: division, label: division }))}
          required
          value={value.division}
          onValueChange={(nextValue) => update('division', nextValue)}
          error={errors.division}
        />
      </div>
      <Field>
        <FieldLabel htmlFor="career-position">Position / Role of Interest</FieldLabel>
        <Input
          id="career-position"
          name="position"
          maxLength={120}
          value={value.position}
          placeholder="e.g. Project Manager, Leasing Agent"
          onChange={(event) => update('position', event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="career-message">Cover Note / Message</FieldLabel>
        <Textarea
          id="career-message"
          name="message"
          rows={5}
          maxLength={1_000}
          value={value.message}
          placeholder="Tell us briefly about your experience and why you'd like to join Trico."
          onChange={(event) => update('message', event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="career-resume">
          Resume * <small>(PDF or Word, max 10MB)</small>
        </FieldLabel>
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 p-3">
          <Upload className="size-5 text-primary" aria-hidden="true" />
          <Input
            id="career-resume"
            name="resume"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => selectFile(event.target.files?.[0])}
            aria-invalid={errors.resumeName === undefined ? undefined : true}
            aria-describedby={
              errors.resumeName === undefined ? undefined : 'career-resume-file-error'
            }
          />
        </div>
        {value.resumeName === '' ? null : (
          <FieldDescription>Selected: {value.resumeName}</FieldDescription>
        )}
        {errors.resumeName === undefined ? null : (
          <FieldError id="career-resume-file-error">{errors.resumeName}</FieldError>
        )}
      </Field>
      {submitError === undefined ? null : (
        <Alert ref={feedbackRef} role="alert" tabIndex={-1}>
          {submitError}
        </Alert>
      )}
      <Button className="w-full" type="submit" disabled={submitting}>
        <Send aria-hidden="true" />
        {submitting ? 'Sending application…' : 'Submit Resume'}
      </Button>
    </form>
  );
}
