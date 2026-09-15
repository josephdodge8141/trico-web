import { useState, type FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';

export function DevelopmentContactForm(): React.JSX.Element {
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    event.currentTarget.reset();
    setSubmitted(true);
  };
  if (submitted) {
    return (
      <div className="dev-form-card ui-form-card dev-form-success ui-form-success" role="status">
        <CheckCircle2 aria-hidden="true" />
        <h3>Thank you for your inquiry!</h3>
        <p>A development specialist will contact you within 24 hours.</p>
      </div>
    );
  }
  return (
    <div className="dev-form-card ui-form-card">
      <h3>Start Your Development Project</h3>
      <form onSubmit={submit}>
        <div className="dev-field-grid ui-field-grid">
          <label>
            First Name *<input name="firstName" required placeholder="John" />
          </label>
          <label>
            Last Name *<input name="lastName" required placeholder="Doe" />
          </label>
          <label>
            Email *<input name="email" type="email" required placeholder="john@example.com" />
          </label>
          <label>
            Phone *<input name="phone" type="tel" required placeholder="(555) 123-4567" />
          </label>
        </div>
        <label>
          Project Type
          <input name="projectType" placeholder="Residential, Commercial, Mixed-Use" />
        </label>
        <label>
          Tell Us About Your Project
          <textarea
            name="message"
            rows={4}
            placeholder="Share details about your development vision…"
          />
        </label>
        <button
          className="dev-button ui-button dev-primary ui-primary dev-wide ui-wide"
          type="submit"
        >
          Get Started <Send aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
