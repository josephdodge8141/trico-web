import { UserRound } from 'lucide-react';

import { Badge } from './ui/badge.js';
import { Card, CardContent, CardHeader } from './ui/card.js';

export interface ProfileCardProps {
  readonly name: string;
  readonly role: string;
  readonly imageSource?: string | undefined;
  readonly imageAltText: string;
  readonly children?: React.ReactNode;
}

export function ProfileCard({
  name,
  role,
  imageSource,
  imageAltText,
  children,
}: ProfileCardProps): React.JSX.Element {
  return (
    <Card
      className="h-full overflow-hidden border border-border/70 shadow-sm"
      data-profile-card="true"
    >
      <div
        className="bg-muted"
        data-profile-media-state={imageSource ? 'available' : 'unavailable'}
      >
        {imageSource ? (
          <img
            className="aspect-[4/5] w-full object-contain"
            src={imageSource}
            alt={imageAltText}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="grid aspect-[4/5] place-items-center text-muted-foreground"
            role="img"
            aria-label={imageAltText}
          >
            <UserRound className="size-12" aria-hidden="true" />
          </div>
        )}
      </div>
      <CardHeader>
        <h3 className="font-heading text-lg font-semibold">{name}</h3>
        <Badge variant="secondary" className="w-fit">
          {role}
        </Badge>
      </CardHeader>
      {children === undefined ? null : (
        <CardContent className="space-y-2 text-sm text-muted-foreground">{children}</CardContent>
      )}
    </Card>
  );
}
