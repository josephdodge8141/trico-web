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
    <div className="dev-form-card ui-form-card ui-form-surface ui-form-surface--standard">
      <h3 className="type-form-title">Start Your Development Project</h3>
      <form
        className="ui-client-form ui-form-layout--standard ui-form-presentation-compact"
        onSubmit={submit}
      >
        <div className="ui-form-presentation-compact__field-grid">
          <div>
            <label htmlFor="development-first-name">First Name *</label>
            <input id="development-first-name" name="firstName" required placeholder="John" />
          </div>
          <div>
            <label htmlFor="development-last-name">Last Name *</label>
            <input id="development-last-name" name="lastName" required placeholder="Doe" />
          </div>
          <div>
            <label htmlFor="development-email">Email *</label>
            <input
              id="development-email"
              name="email"
              type="email"
              required
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label htmlFor="development-phone">Phone *</label>
            <input
              id="development-phone"
              name="phone"
              type="tel"
              required
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
        <div>
          <label htmlFor="development-project-type">Project Type</label>
          <input
            id="development-project-type"
            name="projectType"
            placeholder="Residential, Commercial, Mixed-Use"
          />
        </div>
        <div>
          <label htmlFor="development-message">Tell Us About Your Project</label>
          <textarea
            id="development-message"
            name="message"
            rows={4}
            placeholder="Share details about your development vision…"
          />
        </div>
        <button
          className="dev-button ui-button dev-primary ui-primary dev-wide ui-wide ui-submit-action ui-submit-action--full"
          type="submit"
        >
          Get Started <Send aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
