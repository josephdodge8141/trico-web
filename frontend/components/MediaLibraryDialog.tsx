import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { MediaAsset, MediaLibraryResponse, MediaPresignResponse } from '../services/cms.js';

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
  const titleId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
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
    const opener =
      document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    void load();
    window.setTimeout(() => closeButton.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
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

  return createPortal(
    <div className="media-library-layer">
      <button
        type="button"
        className="media-library-backdrop"
        aria-label="Close media library"
        onClick={onClose}
      />
      <section
        className="media-library-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header>
          <div>
            <p className="editor-sheet-kicker">Choose an image</p>
            <h2 id={titleId}>Media library</h2>
            <p>Select an existing image or upload a new one.</p>
          </div>
          <button
            ref={closeButton}
            type="button"
            aria-label="Close media library"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <form className="media-library-upload" onSubmit={(event) => void submitUpload(event)}>
          <label>
            Image file
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => setFile(event.target.files?.[0])}
            />
          </label>
          <label>
            Image name
            <input value={name} maxLength={160} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Image description
            <textarea
              value={altText}
              rows={2}
              maxLength={500}
              onChange={(event) => setAltText(event.target.value)}
            />
          </label>
          <p className="editor-help">
            Describe what is visible so visitors using screen readers receive the same information.
          </p>
          <button type="submit" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload image'}
          </button>
        </form>

        {error === '' ? null : (
          <p className="editor-error" role="alert">
            {error}
          </p>
        )}
        <div className="media-library-grid" aria-live="polite">
          {assets.map((asset) => (
            <button key={asset.id} type="button" onClick={() => onSelect(asset)}>
              <img src={asset.publicUrl} alt={asset.altText} />
              <span>{asset.name}</span>
            </button>
          ))}
        </div>
        {assets.length === 0 && !loading ? <p>No images have been added yet.</p> : null}
        {cursor === null ? null : (
          <button type="button" disabled={loading} onClick={() => void load(cursor)}>
            {loading ? 'Loading…' : 'Load more images'}
          </button>
        )}
      </section>
    </div>,
    document.body,
  );
}
