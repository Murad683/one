import type { CSSProperties, ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const instructions: ScreenReaderInstructions = {
  draggable:
    'Sıranı dəyişmək üçün Boşluq düyməsi ilə götürün, ox düymələri ilə yerini dəyişin, yenidən Boşluq ilə buraxın. Ləğv etmək üçün Esc.',
};

interface CellProps {
  id: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}

const SortableCell = ({ id, disabled, label, children }: CellProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.7 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-label={label}
      className="touch-manipulation select-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </div>
  );
};

interface SortableGridProps<T> {
  items: T[];
  getId: (item: T) => string;
  /** Accessible name of one cell (read by screen readers while moving it). */
  getLabel: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  onReorder: (ids: string[]) => void;
  className?: string;
  disabled?: boolean;
  /** Not sortable, shown after the items (the "add" tile). */
  trailing?: ReactNode;
}

/**
 * A wrapping, drag-to-reorder list. Mouse: drag after a few pixels. Touch: long press (so the page still
 * scrolls). Keyboard: focus a cell, Space to lift it, arrow keys to move, Space to drop.
 */
export const SortableGrid = <T,>({
  items,
  getId,
  getLabel,
  renderItem,
  onReorder,
  className,
  disabled = false,
  trailing,
}: SortableGridProps<T>) => {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);
  const labelOf = (id: string | number): string => {
    const index = ids.indexOf(String(id));
    return index < 0 ? '' : getLabel(items[index], index);
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${labelOf(active.id)} götürüldü.`,
    onDragOver: ({ active, over }) => (over ? `${labelOf(active.id)} ${labelOf(over.id)} üzərindədir.` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `${labelOf(active.id)} yeni yerinə qoyuldu.` : `${labelOf(active.id)} əvvəlki yerində qaldı.`,
    onDragCancel: ({ active }) => `${labelOf(active.id)} əvvəlki yerinə qaytarıldı.`,
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements, screenReaderInstructions: instructions }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy} disabled={disabled}>
        <div className={className}>
          {items.map((item, index) => (
            <SortableCell key={getId(item)} id={getId(item)} disabled={disabled} label={getLabel(item, index)}>
              {renderItem(item, index)}
            </SortableCell>
          ))}
          {trailing}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default SortableGrid;
