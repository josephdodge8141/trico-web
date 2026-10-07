import { useCallback, useEffect, useState } from 'react';
import { ImagePlus } from 'lucide-react';

import type { MediaAsset, MediaLibraryResponse, MediaPresignResponse } from '../services/cms.js';
import { Alert } from './ui/alert.js';
import { Button } from './ui/button.js';
import { Card, CardContent } from './ui/card.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.js';
import { Field, FieldDescription, FieldGroup, FieldLabel } from './ui/field.js';
import { Input } from './ui/input.js';
import { Separator } from './ui/separator.js';
import { Textarea } from './ui/textarea.js';

export interface MediaLibraryDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSelect: (asset: MediaAsset) => void;
  readonly loadPage: (cursor?: string) => Promise<MediaLibraryResponse>;
  readonly requestUpload: (file: File) => Promise<MediaPresignResponse>;
  readonly upload: (file: File, uploadUrl: string) => Promise<void>;
  readonly confirmUpload: (uploadId: string, name: string, altText: string) => Promise<MediaAsset>;
}

export function MediaLibraryDialog({
  open,
  onClose,
  onSelect,
  loadPage,
  requestUpload,
  upload,
  confirmUpload,
}: MediaLibraryDialogProps): React.JSX.Element | null {
  const [assets, setAssets] = useState<readonly MediaAsset[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File>();
  const [name, setName] = useState('');
  const [altText, setAltText] = useState('');

  const load = useCallback(
    async (nextCursor?: string): Promise<void> => {
      setLoading(true);
      setError('');
      try {
        const page = await loadPage(nextCursor);
        setAssets((current) =>
          nextCursor === undefined ? page.assets : [...current, ...page.assets],
        );
        setCursor(page.nextCursor);
      } catch {
        setError('We could not load the media library. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [loadPage],
  );

  useEffect(() => {
    if (!open) return;
    void load();
  }, [load, onClose, open]);

  if (!open) return null;

  const submitUpload = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (file === undefined || name.trim() === '' || altText.trim() === '') {
      setError('Choose an image and describe it before uploading.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const reservation = await requestUpload(file);
      await upload(file, reservation.uploadUrl);
      const asset = await confirmUpload(reservation.uploadId, name.trim(), altText.trim());
      setAssets((current) => [asset, ...current]);
      setFile(undefined);
      setName('');
      setAltText('');
      onSelect(asset);
    } catch {
      setError('We could not upload that image. Check the file and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[90svh] w-full overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary">
            <ImagePlus className="size-5" aria-hidden="true" />
          </span>
          <DialogTitle className="text-xl">Media library</DialogTitle>
          <DialogDescription>Select an existing image or upload a new one.</DialogDescription>
        </DialogHeader>
        <Separator />
        <form className="space-y-4" onSubmit={(event) => void submitUpload(event)}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="media-file">Image file</FieldLabel>
              <Input
                id="media-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => setFile(event.target.files?.[0])}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="media-name">Image name</FieldLabel>
              <Input
                id="media-name"
                value={name}
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="media-description">Image description</FieldLabel>
              <Textarea
                id="media-description"
                value={altText}
                rows={2}
                maxLength={500}
                onChange={(event) => setAltText(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <FieldDescription>
            Describe what is visible so visitors using screen readers receive the same information.
          </FieldDescription>
          <Button type="submit" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload image'}
          </Button>
        </form>

        {error === '' ? null : <Alert variant="destructive">{error}</Alert>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-live="polite">
          {assets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden p-0">
              <Button
                variant="ghost"
                className="h-auto w-full flex-col items-stretch p-0 text-left"
                type="button"
                onClick={() => onSelect(asset)}
              >
                <img
                  className="aspect-square w-full object-cover"
                  src={asset.publicUrl}
                  alt={asset.altText}
                />
                <CardContent className="p-3 text-sm font-medium whitespace-normal">
                  {asset.name}
                </CardContent>
              </Button>
            </Card>
          ))}
        </div>
        {assets.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">No images have been added yet.</p>
        ) : null}
        {cursor === null ? null : (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => void load(cursor)}
          >
            {loading ? 'Loading…' : 'Load more images'}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
