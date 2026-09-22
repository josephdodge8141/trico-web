import { useState } from 'react';
import { Send } from 'lucide-react';

export function StorageContactForm(): React.JSX.Element {
  const [submitted, setSubmitted] = useState(false);
  return (
    <form
      className="storage-contact-form ui-contact-form ui-client-form ui-form-layout--standard"
      aria-label="Request a storage management consultation"
      onSubmit={(event) => {
        event.preventDefault();
        if (!event.currentTarget.reportValidity()) return;
        event.currentTarget.reset();
        setSubmitted(true);
      }}
    >
      <h3 className="type-form-title">Request a Consultation</h3>
      <div className="storage-form-row ui-form-row">
        <label>
          First Name *<input name="firstName" required placeholder="John" />
        </label>
        <label>
          Last Name *<input name="lastName" required placeholder="Doe" />
        </label>
      </div>
      <div className="storage-form-row ui-form-row">
        <label>
          Email *<input name="email" type="email" required placeholder="john@example.com" />
        </label>
        <label>
          Phone *<input name="phone" type="tel" required placeholder="(555) 123-4567" />
        </label>
      </div>
      <label>
        Number of Facilities
        <input name="facilityCount" placeholder="e.g., 1, 2-5, 5+" />
      </label>
      <label>
        Tell Us About Your Facilities
        <textarea
          name="message"
          rows={4}
          placeholder="Share details about your storage facilities and management needs..."
        />
      </label>
      <button className="ui-submit-action ui-submit-action--full" type="submit">
        Get Started <Send aria-hidden="true" />
      </button>
      {submitted ? (
        <p role="status">
          Thank you for your inquiry! A storage management specialist will contact you within 24
          hours.
        </p>
      ) : null}
    </form>
  );
}
