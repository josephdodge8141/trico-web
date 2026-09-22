import { Mail, Phone, UserRound } from 'lucide-react';
import { useState } from 'react';

export interface ProfileCardProps {
  readonly description: string;
  readonly email?: string;
  readonly emailLabel?: string;
  readonly imageAltText: string;
  readonly imageSource?: string | undefined;
  readonly name: string;
  readonly phone?: string;
  readonly role: string;
}

export function ProfileCard({
  description,
  email,
  emailLabel = 'Email',
  imageAltText,
  imageSource,
  name,
  phone,
  role,
}: ProfileCardProps): React.JSX.Element {
  const [failedImageSource, setFailedImageSource] = useState<string>();
  const hasPortrait = imageSource !== undefined && failedImageSource !== imageSource;

  return (
    <article className="profile-card" data-profile-card="true">
      {hasPortrait ? (
        <div className="profile-card-media" data-profile-media-state="available">
          <img
            src={imageSource}
            alt={imageAltText}
            onError={() => setFailedImageSource(imageSource)}
          />
        </div>
      ) : (
        <div
          className="profile-card-media profile-card-media-unavailable"
          data-profile-media-state="unavailable"
          role="img"
          aria-label={`Portrait unavailable for ${name}`}
        >
          <UserRound aria-hidden="true" />
          <span>Photo coming soon</span>
        </div>
      )}
      <div className="profile-card-body">
        <h3>{name}</h3>
        <strong>{role}</strong>
        <p>{description}</p>
        {email !== undefined || phone !== undefined ? (
          <div className="profile-card-contacts">
            {phone === undefined ? null : (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                aria-label={`Call ${name} at ${phone}`}
              >
                <Phone aria-hidden="true" /> {phone}
              </a>
            )}
            {email === undefined ? null : (
              <a href={`mailto:${email}`} aria-label={`Email ${name} at ${email}`}>
                <Mail aria-hidden="true" /> {emailLabel}
              </a>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}
