import { ExternalLink, MessageSquareHeart } from 'lucide-react';

import { Button } from './ui/button.js';
import { Card, CardContent, CardHeader } from './ui/card.js';

export interface ReviewPlatformCardProps {
  readonly name: string;
  readonly description: string;
  readonly externalUrl: string;
  readonly actionLabel?: string;
  readonly unavailableLabel?: string;
}

export function ReviewPlatformCard({
  name,
  description,
  externalUrl,
  actionLabel = 'Review on',
  unavailableLabel = 'Review link coming soon',
}: ReviewPlatformCardProps): React.JSX.Element {
  return (
    <Card className="h-full border border-border/70 shadow-sm" data-review-platform-card="true">
      <CardHeader className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary">
          <MessageSquareHeart className="size-5" aria-hidden="true" />
        </span>
        <h3 className="font-heading text-lg font-semibold">{name}</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        {externalUrl ? (
          <Button
            render={<a href={externalUrl} target="_blank" rel="noreferrer" />}
            variant="outline"
            size="sm"
          >
            {actionLabel} {name} <ExternalLink aria-hidden="true" />
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">{unavailableLabel}</span>
        )}
      </CardContent>
    </Card>
  );
}
