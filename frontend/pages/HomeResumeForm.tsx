import { useState, type FormEvent } from 'react';
import { CheckCircle2, Send, Upload } from 'lucide-react';

const divisions = [
  'Real Estate',
  'Property Management',
  'Construction',
  'Storage Management',
  'Development',
  'Other / General',
] as const;

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

export function HomeResumeForm(): React.JSX.Element {
  const [value, setValue] = useState<ResumeFormValue>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submittedName, setSubmittedName] = useState<string>();

  const update = (field: FormField, nextValue: string): void => {
    setValue((current) => ({ ...current, [field]: nextValue }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const selectFile = (file: File | undefined): void => {
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
    update('resumeName', file.name);
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const nextErrors = validate(value);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmittedName(value.name.trim().split(/\s+/)[0] ?? value.name.trim());
  };

  if (submittedName !== undefined) {
    return (
      <div className="home-resume-success ui-resume-success" role="status">
        <CheckCircle2 aria-hidden="true" />
        <h4>Thank you, {submittedName}!</h4>
        <p>
          Your details are ready. Email your resume to{' '}
          <a href="mailto:apply@tricoinc.com">apply@tricoinc.com</a> to finish applying.
        </p>
        <button
          type="button"
          onClick={() => {
            setValue(emptyForm);
            setSubmittedName(undefined);
          }}
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form
      className="home-resume-form ui-resume-form ui-client-form ui-form-layout--inquiry"
      noValidate
      onSubmit={submit}
    >
      <div className="home-form-grid ui-form-grid">
        <label>
          <span>Full Name *</span>
          <input
            name="name"
            autoComplete="name"
            maxLength={100}
            value={value.name}
            onChange={(event) => update('name', event.target.value)}
            aria-invalid={errors.name === undefined ? undefined : true}
            aria-describedby={errors.name === undefined ? undefined : 'home-resume-name-error'}
          />
          {errors.name === undefined ? null : (
            <small id="home-resume-name-error" className="home-form-error ui-form-error">
              {errors.name}
            </small>
          )}
        </label>
        <label>
          <span>Email *</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={255}
            value={value.email}
            onChange={(event) => update('email', event.target.value)}
            aria-invalid={errors.email === undefined ? undefined : true}
            aria-describedby={errors.email === undefined ? undefined : 'home-resume-email-error'}
          />
          {errors.email === undefined ? null : (
            <small id="home-resume-email-error" className="home-form-error ui-form-error">
              {errors.email}
            </small>
          )}
        </label>
        <label>
          <span>Phone</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={20}
            value={value.phone}
            onChange={(event) => update('phone', event.target.value)}
            aria-invalid={errors.phone === undefined ? undefined : true}
            aria-describedby={errors.phone === undefined ? undefined : 'home-resume-phone-error'}
          />
          {errors.phone === undefined ? null : (
            <small id="home-resume-phone-error" className="home-form-error ui-form-error">
              {errors.phone}
            </small>
          )}
        </label>
        <label>
          <span>Division of Interest *</span>
          <select
            name="division"
            value={value.division}
            onChange={(event) => update('division', event.target.value)}
            aria-invalid={errors.division === undefined ? undefined : true}
            aria-describedby={
              errors.division === undefined ? undefined : 'home-resume-division-error'
            }
          >
            <option value="">Select a division</option>
            {divisions.map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>
          {errors.division === undefined ? null : (
            <small id="home-resume-division-error" className="home-form-error ui-form-error">
              {errors.division}
            </small>
          )}
        </label>
      </div>
      <label>
        <span>Position / Role of Interest</span>
        <input
          name="position"
          maxLength={120}
          value={value.position}
          placeholder="e.g. Project Manager, Leasing Agent"
          onChange={(event) => update('position', event.target.value)}
        />
      </label>
      <label>
        <span>Cover Note / Message</span>
        <textarea
          name="message"
          rows={5}
          maxLength={1_000}
          value={value.message}
          placeholder="Tell us briefly about your experience and why you'd like to join Trico."
          onChange={(event) => update('message', event.target.value)}
        />
      </label>
      <label>
        <span>
          Resume * <small>(PDF or Word, max 10MB)</small>
        </span>
        <span className="home-file-control ui-file-control">
          <Upload aria-hidden="true" />
          <span>{value.resumeName === '' ? 'Click to upload your resume' : value.resumeName}</span>
          <input
            name="resume"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => selectFile(event.target.files?.[0])}
            aria-invalid={errors.resumeName === undefined ? undefined : true}
            aria-describedby={
              errors.resumeName === undefined ? undefined : 'home-resume-file-error'
            }
          />
        </span>
        {errors.resumeName === undefined ? null : (
          <small id="home-resume-file-error" className="home-form-error ui-form-error">
            {errors.resumeName}
          </small>
        )}
      </label>
      <button
        className="home-submit-button ui-submit-button ui-submit-action ui-submit-action--full"
        type="submit"
      >
        <Send aria-hidden="true" />
        Submit Resume
      </button>
      <p className="home-form-note ui-form-note">
        Your information is prepared locally in this browser.
      </p>
    </form>
  );
}
