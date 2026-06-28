import { useRef, useState, useCallback, useEffect } from 'react';

export interface DragSortItem {
  id: string;
}

export interface DragSortState {
  draggedId: string | null;
  overColName: string | null;
  overIndex: number | null;
}

interface GhostStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  title: string;
}

// Returns: dragState, ghostStyle, onPointerDown(itemId, colName, title, e), onCommit(newOrder)
export function useDragSort(
  getOrderedIds: (colName: string) => string[],
  onReorder: (colName: string, newOrder: string[], itemId: string, targetColName: string) => void,
  getColElementId: (colName: string) => string
) {
  const [dragState, setDragState] = useState<DragSortState>({
    draggedId: null,
    overColName: null,
    overIndex: null,
  });
  const [ghost, setGhost] = useState<GhostStyle>({ x: 0, y: 0, width: 200, height: 42, visible: false, title: '' });

  const dragRef = useRef<{
    id: string;
    sourceCol: string;
    title: string;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    cardWidth: number;
    cardHeight: number;
    active: boolean;
  } | null>(null);

  const getInsertionIndex = useCallback((colName: string, clientY: number, excludeId: string): number => {
    const colEl = document.getElementById(getColElementId(colName));
    if (!colEl) return 0;
    const cards = Array.from(colEl.querySelectorAll<HTMLElement>('[data-card-id]'));
    const eligibleCards = cards.filter(el => el.dataset.cardId !== excludeId);

    for (let i = 0; i < eligibleCards.length; i++) {
      const rect = eligibleCards[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return eligibleCards.length;
  }, [getColElementId]);

  const getColAtPoint = useCallback((x: number, y: number): string | null => {
    const els = document.querySelectorAll<HTMLElement>('[data-col-drop-zone]');
    for (const el of Array.from(els)) {
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return el.dataset.colDropZone || null;
      }
    }
    return null;
  }, []);

  const onPointerDown = useCallback((itemId: string, colName: string, title: string, e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const card = e.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    dragRef.current = {
      id: itemId,
      sourceCol: colName,
      title,
      startX: e.clientX,
      startY: e.clientY,
      offsetX,
      offsetY,
      cardWidth: rect.width,
      cardHeight: rect.height,
      active: false,
    };

    card.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dr = dragRef.current;

      const dx = e.clientX - dr.startX;
      const dy = e.clientY - dr.startY;

      if (!dr.active && Math.sqrt(dx * dx + dy * dy) > 5) {
        dr.active = true;
        setGhost({
          x: e.clientX - dr.offsetX,
          y: e.clientY - dr.offsetY,
          width: dr.cardWidth,
          height: dr.cardHeight,
          visible: true,
          title: dr.title,
        });
        setDragState({ draggedId: dr.id, overColName: dr.sourceCol, overIndex: null });
      }

      if (!dr.active) return;

      setGhost(prev => ({ ...prev, x: e.clientX - dr.offsetX, y: e.clientY - dr.offsetY }));

      const colName = getColAtPoint(e.clientX, e.clientY);
      if (colName) {
        const idx = getInsertionIndex(colName, e.clientY, dr.id);
        setDragState(prev => {
          if (prev.overColName === colName && prev.overIndex === idx) return prev;
          return { ...prev, draggedId: dr.id, overColName: colName, overIndex: idx };
        });
      }
    };

    const onPointerUp = (_e: PointerEvent) => {
      if (!dragRef.current || !dragRef.current.active) {
        dragRef.current = null;
        return;
      }
      const dr = dragRef.current;
      dragRef.current = null;

      setGhost(prev => ({ ...prev, visible: false }));

      setDragState(prev => {
        const { overColName, overIndex } = prev;
        if (overColName !== null && overIndex !== null) {
          const targetCol = overColName;
          const idx = overIndex;
          const sourceCol = dr.sourceCol;

          // Build new order for the target column
          const targetIds = getOrderedIds(targetCol).filter(id => id !== dr.id);
          targetIds.splice(idx, 0, dr.id);

          onReorder(sourceCol, targetIds, dr.id, targetCol);
        }
        return { draggedId: null, overColName: null, overIndex: null };
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [getInsertionIndex, getColAtPoint, getOrderedIds, onReorder]);

  return { dragState, ghost, onPointerDown };
}
