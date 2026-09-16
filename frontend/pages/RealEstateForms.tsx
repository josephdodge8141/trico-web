import { useState, type FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';

function useLocalFormSuccess(): readonly [boolean, (event: FormEvent<HTMLFormElement>) => void] {
  const [submitted, setSubmitted] = useState(false);
  return [
    submitted,
    (event) => {
      event.preventDefault();
      event.currentTarget.reset();
      setSubmitted(true);
    },
  ];
}

export function RealEstateNewClientForm(): React.JSX.Element {
  const [submitted, submit] = useLocalFormSuccess();
  return (
    <section id="new-client" className="re-section ui-section re-new-client ui-new-client">
      <div className="re-container ui-container re-form-narrow ui-form-narrow">
        <header className="re-section-heading ui-section-heading">
          <span className="re-pill ui-pill">New Clients</span>
          <h2 className="type-section-title type-section-title-compact">New Client Inquiry</h2>
          <p>
            Buying, selling, or investing? Tell us a bit about your goals and one of our agents will
            reach out within one business day.
          </p>
        </header>
        <div className="re-form-card ui-form-card">
          {submitted ? (
            <div className="re-form-success ui-form-success" role="status">
              <CheckCircle2 aria-hidden="true" />
              <h3>Thanks for reaching out!</h3>
              <p>Your inquiry is ready for our team to review.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="re-field-grid ui-field-grid">
                <label>
                  Full Name *
                  <input name="name" required placeholder="Jane Smith" />
                </label>
                <label>
                  Email *
                  <input name="email" type="email" required placeholder="jane@example.com" />
                </label>
                <label>
                  Phone
                  <input name="phone" type="tel" placeholder="(801) 555-1234" />
                </label>
                <label>
                  I’m interested in *
                  <select name="interest" required defaultValue="">
                    <option value="" disabled>
                      Select an option
                    </option>
                    <option>Buying a home</option>
                    <option>Selling a property</option>
                    <option>Land / acreage</option>
                    <option>Commercial property</option>
                    <option>Investment property</option>
                    <option>Other</option>
                  </select>
                </label>
              </div>
              <label>
                Property Address (optional)
                <input name="address" placeholder="123 Main St, Draper, UT" />
              </label>
              <label>
                How can we help?
                <textarea
                  name="message"
                  rows={4}
                  placeholder="Tell us about your property or goals…"
                />
              </label>
              <button
                className="re-button ui-button re-button-primary ui-button-primary re-button-wide ui-button-wide"
                type="submit"
              >
                Submit Inquiry <Send aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export function RealEstateContactForm(): React.JSX.Element {
  const [submitted, submit] = useLocalFormSuccess();
  if (submitted) {
    return (
      <div className="re-form-card ui-form-card re-form-success ui-form-success" role="status">
        <CheckCircle2 aria-hidden="true" />
        <h3>Thank you for your inquiry!</h3>
        <p>A real estate specialist will contact you within 24 hours.</p>
      </div>
    );
  }
  return (
    <div className="re-form-card ui-form-card">
      <h3 className="type-form-title">Start Your Real Estate Journey</h3>
      <form onSubmit={submit}>
        <div className="re-field-grid ui-field-grid">
          <label>
            First Name *
            <input name="firstName" required placeholder="John" />
          </label>
          <label>
            Last Name *
            <input name="lastName" required placeholder="Doe" />
          </label>
          <label>
            Email *
            <input name="email" type="email" required placeholder="john@example.com" />
          </label>
          <label>
            Phone *
            <input name="phone" type="tel" required placeholder="(555) 123-4567" />
          </label>
        </div>
        <label>
          I’m Interested In
          <input name="interest" placeholder="Buying, Selling, Leasing, Development" />
        </label>
        <label>
          Tell Us About Your Goals
          <textarea
            name="message"
            rows={4}
            placeholder="Share details about your real estate needs…"
          />
        </label>
        <button
          className="re-button ui-button re-button-primary ui-button-primary re-button-wide ui-button-wide"
          type="submit"
        >
          Get Started <Send aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
