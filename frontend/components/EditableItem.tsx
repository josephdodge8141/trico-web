export interface EditableItemProps {
  readonly as?: 'div' | 'li';
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
  as = 'div',
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
  const Element = as;
  return (
    <Element
      data-slot="editable-item"
      className={
        active
          ? 'flex min-w-0 flex-col rounded-lg outline outline-2 outline-dashed outline-primary/30 outline-offset-2'
          : 'min-w-0'
      }
      onDragOver={active && reorderable ? (event) => event.preventDefault() : undefined}
      onDrop={active && reorderable ? onDrop : undefined}
    >
      {children}
      {active ? (
        <div
          className="mt-2 flex flex-wrap gap-1 rounded-lg border bg-background/95 p-1 shadow-md"
          role="group"
          aria-label={`Actions for ${label}`}
        >
          {reorderable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 min-w-11"
              draggable={!disabled}
              onDragStart={onDragStart}
              disabled={disabled}
              aria-label={`Drag ${label} to reorder`}
              title="Drag to reorder"
            >
              <GripVertical className="size-4" aria-hidden="true" /> Move
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-11 min-w-11"
            onClick={onEdit}
            disabled={disabled}
            aria-label={`Edit ${label}`}
          >
            <Pencil className="size-3.5" aria-hidden="true" /> Edit
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="min-h-11 min-w-11"
            onClick={onDelete}
            disabled={disabled}
            aria-label={`Delete ${label}`}
          >
            <Trash2 className="size-4" aria-hidden="true" /> Delete
          </Button>
          {reorderable ? (
            <span className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 min-w-11"
                onClick={() => onMove(-1)}
                disabled={disabled || index === 0}
                aria-label={`Move ${label} up`}
              >
                <ArrowUp className="size-4" aria-hidden="true" /> Up
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 min-w-11"
                onClick={() => onMove(1)}
                disabled={disabled || index === lastIndex}
                aria-label={`Move ${label} down`}
              >
                <ArrowDown className="size-4" aria-hidden="true" /> Down
              </Button>
            </span>
          ) : null}
        </div>
      ) : null}
    </Element>
  );
}
import { ArrowDown, ArrowUp, GripVertical, Pencil, Trash2 } from 'lucide-react';

import { Button } from './ui/button.js';
