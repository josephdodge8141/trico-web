import type { ExternalSource } from '../services/cms.js';

export interface SourceFieldControlsProps {
  readonly source: ExternalSource;
  readonly fieldLabels: Readonly<Record<string, string>>;
  readonly onChange: (overriddenFields: readonly string[]) => Promise<void>;
  readonly onDelete: () => Promise<void>;
}

export function SourceFieldControls({
  source,
  fieldLabels,
  onChange,
  onDelete,
}: SourceFieldControlsProps): React.JSX.Element {
  const pause = async (field: string): Promise<void> => {
    const label = fieldLabels[field] ?? 'this field';
    if (!window.confirm(`Use a manual value and pause updates for ${label}?`)) return;
    await onChange(
      [...source.overriddenFields, field].filter(
        (value, index, values) => values.indexOf(value) === index,
      ),
    );
  };
  const resume = async (field: string): Promise<void> => {
    await onChange(source.overriddenFields.filter((candidate) => candidate !== field));
  };
  const remove = async (): Promise<void> => {
    if (!window.confirm('Delete this listing? Its automatic source mapping will also be removed.'))
      return;
    await onDelete();
  };

  return (
    <section className="source-field-controls" aria-label="Automatic listing updates">
      <header>
        <div>
          <strong>{source.type} automatic updates</strong>
          <p>Choose which details should stay manual.</p>
        </div>
        <span className={source.enabled ? 'source-badge source-badge-auto' : 'source-badge'}>
          {source.enabled ? 'Automatic' : 'Paused'}
        </span>
      </header>
      <ul>
        {source.validationFields.map((field) => {
          const overridden = source.overriddenFields.includes(field);
          const label = fieldLabels[field] ?? 'Listing detail';
          return (
            <li key={field}>
              <span>{label}</span>
              <span
                className={
                  overridden ? 'source-badge source-badge-manual' : 'source-badge source-badge-auto'
                }
              >
                {overridden ? 'Manual' : 'From source'}
              </span>
              <button
                type="button"
                onClick={() => void (overridden ? resume(field) : pause(field))}
              >
                {overridden ? 'Resume automatic updates' : 'Use a manual value'}
              </button>
            </li>
          );
        })}
      </ul>
      <button className="source-delete" type="button" onClick={() => void remove()}>
        Delete listing
      </button>
    </section>
  );
}
