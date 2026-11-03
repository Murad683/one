import { useState } from 'react';

/**
 * Reordering for a list of tiles: drag and drop on a computer, and `move` for the arrow buttons
 * (touch screens and the keyboard have no drag and drop). `commit` receives the whole new list.
 */
export function useReorder<T>(items: T[], commit: (next: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const moveTo = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const dragProps = (index: number) => ({
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      setDragIndex(index);
      event.dataTransfer.effectAllowed = 'move';
      // Firefox only starts a drag when some data is set.
      event.dataTransfer.setData('text/plain', String(index));
    },
    onDragOver: (event: React.DragEvent) => {
      if (dragIndex === null) return; // not one of our tiles (e.g. files dragged from the desktop)
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (overIndex !== index) setOverIndex(index);
    },
    onDrop: (event: React.DragEvent) => {
      if (dragIndex === null) return;
      event.preventDefault();
      moveTo(dragIndex, index);
      reset();
    },
    onDragEnd: reset,
  });

  return {
    dragProps,
    dragIndex,
    overIndex,
    move: (index: number, delta: -1 | 1) => moveTo(index, index + delta),
  };
}
