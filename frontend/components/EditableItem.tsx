export interface EditableItemProps {
  readonly active: boolean;
  readonly label: string;
  readonly children: React.ReactNode;
  readonly index: number;
  readonly lastIndex: number;
  readonly disabled?: boolean;
  readonly reorderable?: boolean;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onMove: (direction: -1 | 1) => void;
  readonly onDragStart?: () => void;
  readonly onDrop?: () => void;
}

export function EditableItem({
  active,
  label,
  children,
  index,
  lastIndex,
  disabled = false,
  reorderable = false,
  onEdit,
  onDelete,
  onMove,
  onDragStart,
  onDrop,
}: EditableItemProps): React.JSX.Element {
  return (
    <div
      className={active ? 'editable-item' : undefined}
      onDragOver={active && reorderable ? (event) => event.preventDefault() : undefined}
      onDrop={active && reorderable ? onDrop : undefined}
    >
      {children}
      {active ? (
        <div className="editable-item-controls" aria-label={`Actions for ${label}`}>
          {reorderable ? (
            <button
              type="button"
              className="editor-drag-handle"
              draggable={!disabled}
              onDragStart={onDragStart}
              disabled={disabled}
              aria-label={`Drag ${label} to reorder`}
              title="Drag to reorder"
            >
              ⋮⋮
            </button>
          ) : null}
          <button type="button" onClick={onEdit} disabled={disabled} aria-label={`Edit ${label}`}>
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            aria-label={`Delete ${label}`}
          >
            Delete
          </button>
          {reorderable ? (
            <span className="editable-item-move-actions">
              <button
                type="button"
                onClick={() => onMove(-1)}
                disabled={disabled || index === 0}
                aria-label={`Move ${label} up`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onMove(1)}
                disabled={disabled || index === lastIndex}
                aria-label={`Move ${label} down`}
              >
                ↓
              </button>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
