import { useState } from 'react';
import { Button } from './ui/button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog.js';

export function PhotoGallery({
  title,
  photos: suppliedPhotos,
}: {
  readonly title: string;
  readonly photos: readonly { readonly src: string; readonly alt: string }[];
}): React.JSX.Element {
  const photos = suppliedPhotos.filter(
    (photo, index) =>
      suppliedPhotos.findIndex((candidate) => candidate.src === photo.src) === index,
  );
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Readonly<Record<string, boolean>>>({});
  const photo = photos[index] ?? photos[0];
  const cover = photos[0];
  const image = (item: typeof photo, className: string): React.ReactNode =>
    item === undefined || item.src === '' || failed[item.src] ? (
      <span className={className + ' grid place-items-center bg-muted text-muted-foreground'}>
        Photo unavailable
      </span>
    ) : (
      <img
        src={item.src}
        alt={item.alt}
        className={className}
        loading="lazy"
        onError={() => setFailed((previous) => ({ ...previous, [item.src]: true }))}
      />
    );
  const move = (direction: number): void =>
    setIndex((current) => (current + direction + photos.length) % photos.length);
  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) setIndex(0);
      }}
    >
      <DialogTrigger
        className="block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={'View photos for ' + title}
      >
        {image(cover, 'aspect-[4/3] w-full object-cover')}
      </DialogTrigger>
      <DialogContent
        className="max-h-[95dvh] overflow-y-auto sm:max-w-4xl"
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') move(-1);
          if (event.key === 'ArrowRight') move(1);
        }}
      >
        <DialogTitle>{title} photos</DialogTitle>
        <DialogDescription>
          Use the arrow keys or photo controls to browse. Escape closes the viewer.
        </DialogDescription>
        {image(photo, 'h-[50dvh] w-full object-contain')}
        <p role="status" className="text-center">
          {photo?.alt} · {index + 1} of {photos.length}
        </p>
        {photos.length > 1 ? (
          <>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => move(-1)}>
                Previous photo
              </Button>
              <Button variant="outline" onClick={() => move(1)}>
                Next photo
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {photos.map((item, position) => (
                <button
                  key={item.src + position}
                  type="button"
                  className="w-20 shrink-0 rounded border-2 focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={'Photo ' + (position + 1)}
                  aria-pressed={position === index}
                  onClick={() => setIndex(position)}
                >
                  {image(item, 'aspect-square w-full object-cover')}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
