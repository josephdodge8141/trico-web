import { useState, type FormEvent } from 'react';

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

function FieldError({
  errors,
  name,
}: {
  readonly errors: FormErrors;
  readonly name: string;
}): React.JSX.Element | null {
  const message = errors[name];
  return message === undefined ? null : <p className="pm-form-error ui-form-error">{message}</p>;
}

export function PropertyManagementNewClientForm(): React.JSX.Element {
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = event.currentTarget;
    const next = errorsFor(new FormData(form), [
      ['name', 'Full name'],
      ['email', 'Email'],
      ['interest', 'Area of interest'],
    ]);
    setErrors(next);
    if (Object.keys(next).length === 0) {
      setSubmitted(true);
      form.reset();
    }
  };
  return (
    <section
      className="pm-section ui-section pm-tint ui-tint pm-new-client ui-new-client"
      id="new-client"
    >
      <div className="pm-container ui-container pm-narrow ui-narrow">
        <header className="pm-section-heading ui-section-heading">
          <span>New Clients</span>
          <h2 className="type-section-title type-section-title-compact">New Client Inquiry</h2>
          <p>
            Looking for a management partner? Share your property details and our team will follow
            up within one business day.
          </p>
        </header>
        <div className="pm-form-card ui-form-card">
          {submitted ? (
            <div className="pm-form-success ui-form-success" role="status">
              <h3>Thanks for reaching out!</h3>
              <p>Your inquiry is ready for our property management team.</p>
              <button type="button" onClick={() => setSubmitted(false)}>
                Submit another inquiry
              </button>
            </div>
          ) : (
            <form aria-label="New client inquiry" noValidate onSubmit={submit}>
              <div className="pm-form-grid ui-form-grid">
                <label>
                  Full Name *<input name="name" maxLength={100} placeholder="Jane Smith" />
                  <FieldError errors={errors} name="name" />
                </label>
                <label>
                  Email *
                  <input name="email" type="email" maxLength={255} placeholder="jane@example.com" />
                  <FieldError errors={errors} name="email" />
                </label>
              </div>
              <div className="pm-form-grid ui-form-grid">
                <label>
                  Phone
                  <input name="phone" type="tel" maxLength={30} placeholder="(801) 555-1234" />
                </label>
                <label>
                  I'm interested in *
                  <select name="interest" defaultValue="">
                    <option value="">Select an option</option>
                    <option>Single-family rental</option>
                    <option>Multi-family / apartments</option>
                    <option>Commercial property</option>
                    <option>HOA / COA management</option>
                    <option>Storage facility</option>
                    <option>Other</option>
                  </select>
                  <FieldError errors={errors} name="interest" />
                </label>
              </div>
              <label>
                Property Address (optional)
                <input
                  name="propertyAddress"
                  maxLength={200}
                  placeholder="123 Main St, Draper, UT"
                />
              </label>
              <label>
                How can we help?
                <textarea
                  name="message"
                  rows={4}
                  maxLength={1000}
                  placeholder="Tell us a little about your property or goals..."
                />
              </label>
              <button
                className="pm-button ui-button pm-button-primary ui-button-primary"
                type="submit"
              >
                Submit Inquiry
              </button>
              <p className="pm-form-note ui-form-note">
                Your information stays on this page until you choose to submit it.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export function PropertyManagementAnalysisForm(): React.JSX.Element {
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = event.currentTarget;
    const next = errorsFor(new FormData(form), [
      ['firstName', 'First name'],
      ['lastName', 'Last name'],
      ['email', 'Email'],
      ['phone', 'Phone'],
    ]);
    setErrors(next);
    if (Object.keys(next).length === 0) {
      setSubmitted(true);
      form.reset();
    }
  };
  return (
    <div className="pm-form-card ui-form-card pm-analysis-form ui-analysis-form">
      <h3>Request Your Free Analysis</h3>
      {submitted ? (
        <div className="pm-form-success ui-form-success" role="status">
          <h4>Thank you for your inquiry!</h4>
          <p>We'll be in touch within 24 hours.</p>
          <button type="button" onClick={() => setSubmitted(false)}>
            Send another request
          </button>
        </div>
      ) : (
        <form aria-label="Free property analysis" noValidate onSubmit={submit}>
          <div className="pm-form-grid ui-form-grid">
            <label>
              First Name *<input name="firstName" placeholder="John" />
              <FieldError errors={errors} name="firstName" />
            </label>
            <label>
              Last Name *<input name="lastName" placeholder="Doe" />
              <FieldError errors={errors} name="lastName" />
            </label>
          </div>
          <div className="pm-form-grid ui-form-grid">
            <label>
              Email *<input name="email" type="email" placeholder="john@example.com" />
              <FieldError errors={errors} name="email" />
            </label>
            <label>
              Phone *<input name="phone" type="tel" placeholder="(555) 123-4567" />
              <FieldError errors={errors} name="phone" />
            </label>
          </div>
          <label>
            Property Type
            <input
              name="propertyType"
              placeholder="e.g., Single-family, Multi-family, Commercial"
            />
          </label>
          <label>
            How Can We Help?
            <textarea
              name="message"
              rows={4}
              placeholder="Tell us about your property and what you're looking for..."
            />
          </label>
          <button className="pm-button ui-button pm-button-primary ui-button-primary" type="submit">
            Get Free Analysis
          </button>
        </form>
      )}
    </div>
  );
}
