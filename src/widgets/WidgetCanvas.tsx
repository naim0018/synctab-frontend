import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { PlacedWidget, WidgetType } from './widgetTypes';
import { WIDGET_CATALOG, STORAGE_KEY, snapToGrid } from './widgetTypes';
import {
  ClockWidget, CalendarWidget, WeatherWidget, SearchWidget,
  NotesWidget, QuotesWidget, TasksWidget, BookmarksWidget,
  CountdownWidget, StocksWidget, GreetingWidget
} from './WidgetContents';
import './WidgetCanvas.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const getWidgetConfig = (type: string, id: string): Record<string, any> => {
  const config: Record<string, any> = {};
  if (type === 'clock') {
    config['synctab-clock-format-24h'] = localStorage.getItem('synctab-clock-format-24h');
    config[`synctab_clock_serif_${id}`] = localStorage.getItem(`synctab_clock_serif_${id}`);
  } else if (type === 'greeting') {
    config['synctab-custom-greeting'] = localStorage.getItem('synctab-custom-greeting');
  } else if (type === 'search') {
    config['synctab-search-engine'] = localStorage.getItem('synctab-search-engine');
  } else if (type === 'notes') {
    config[`synctab_wn_${id}`] = localStorage.getItem(`synctab_wn_${id}`);
  } else if (type === 'countdown') {
    config[`synctab_countdown_${id}`] = localStorage.getItem(`synctab_countdown_${id}`);
    config[`synctab_countdown_${id}_title`] = localStorage.getItem(`synctab_countdown_${id}_title`);
  } else if (type === 'bookmarks') {
    const source = localStorage.getItem(`synctab_bm_source_${id}`) || 'custom';
    config[`synctab_bm_mode_${id}`] = localStorage.getItem(`synctab_bm_mode_${id}`);
    config[`synctab_bm_source_${id}`] = source;
    config[`synctab_bm_search_${id}`] = localStorage.getItem(`synctab_bm_search_${id}`);
    config[`synctab_bm_show_count_${id}`] = localStorage.getItem(`synctab_bm_show_count_${id}`);
    config[`synctab_bm_append_top_${id}`] = localStorage.getItem(`synctab_bm_append_top_${id}`);
    config[`synctab_bm_append_recent_${id}`] = localStorage.getItem(`synctab_bm_append_recent_${id}`);
    config[`synctab_bm_power_title_${id}`] = localStorage.getItem(`synctab_bm_power_title_${id}`);
    config[`synctab_bm_power_new_tab_${id}`] = localStorage.getItem(`synctab_bm_power_new_tab_${id}`);
    config[`synctab_bm_power_allow_change_icons_${id}`] = localStorage.getItem(`synctab_bm_power_allow_change_icons_${id}`);
    
    // Only save custom bookmarks to backend if source is 'custom'
    if (source === 'custom') {
      try {
        const bms = localStorage.getItem(`synctab_widget_bookmarks_${id}`);
        config[`synctab_widget_bookmarks_${id}`] = bms ? JSON.parse(bms) : null;
      } catch {
        config[`synctab_widget_bookmarks_${id}`] = null;
      }
    } else {
      config[`synctab_widget_bookmarks_${id}`] = null;
    }
  }
  return config;
};

const applyWidgetConfig = (config?: Record<string, any>) => {
  if (!config) return;
  Object.entries(config).forEach(([key, val]) => {
    if (val !== null && val !== undefined) {
      if (typeof val === 'object') {
        localStorage.setItem(key, JSON.stringify(val));
      } else {
        localStorage.setItem(key, String(val));
      }
    }
  });
};

interface Task { id: string; title: string; status: string; priority: string; }
interface Bookmark { id: string; title: string; url: string; }

interface WidgetCanvasProps {
  pageId: string;                    // 'dashboard' or custom page id
  tasks: Task[];
  bookmarks: Bookmark[];
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  isPanelOpen: boolean;
  setIsPanelOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  currentUser?: { id: string; name: string; email?: string | null } | null;
}

// ─── WIDGET RENDERER ───────────────────────────────────────────────────────
const WidgetContent: React.FC<{ widget: PlacedWidget; tasks: Task[]; bookmarks: Bookmark[]; currentUser?: { id: string; name: string; email?: string | null } | null }> = ({ widget, tasks, bookmarks, currentUser }) => {
  switch (widget.type) {
    case 'clock':     return <ClockWidget widgetId={widget.id} config={widget.config} />;
    case 'calendar':  return <CalendarWidget />;
    case 'weather':   return <WeatherWidget />;
    case 'search':    return <SearchWidget widgetId={widget.id} config={widget.config} />;
    case 'greeting':  return <GreetingWidget widgetId={widget.id} userName={currentUser?.name} config={widget.config} />;
    case 'notes':     return <NotesWidget widgetId={widget.id} config={widget.config} />;
    case 'quotes':    return <QuotesWidget />;
    case 'tasks':     return <TasksWidget tasks={tasks} />;
    case 'bookmarks': return <BookmarksWidget bookmarks={bookmarks} widgetId={widget.id} config={widget.config} />;
    case 'countdown': return <CountdownWidget widgetId={widget.id} config={widget.config} />;
    case 'stocks':    return <StocksWidget />;
    default:          return null;
  }
};

// ─── WIDGET CANVAS ─────────────────────────────────────────────────────────
const WidgetCanvas: React.FC<WidgetCanvasProps> = ({ 
  pageId, 
  tasks, 
  bookmarks,
  isEditing,
  setIsEditing,
  isPanelOpen,
  setIsPanelOpen,
  currentUser
}) => {
  const storageKey = `${STORAGE_KEY}_${pageId}`;
  const [widgets, setWidgets] = useState<PlacedWidget[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved widgets layout:', e);
    }

    // If no saved layout and this is the main dashboard, return the centered Clock, Greeting and Search widgets
    if (pageId === 'dashboard') {
      const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
      return [
        {
          id: 'default_clock',
          type: 'clock',
          x: Math.max(0, Math.round((width - 400) / 2)),
          y: 140,
          w: 400,
          h: 130
        },
        {
          id: 'default_greeting',
          type: 'greeting',
          x: Math.max(0, Math.round((width - 500) / 2)),
          y: 280,
          w: 500,
          h: 100
        },
        {
          id: 'default_search',
          type: 'search',
          x: Math.max(0, Math.round((width - 520) / 2)),
          y: 390,
          w: 520,
          h: 56
        }
      ];
    }
    return [];
  });
  const widgetsRef = useRef(widgets);
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeMoreMenu, setActiveMoreMenu] = useState<string | null>(null);
  const [panelSearch, setPanelSearch] = useState('');
  const [showPanelSearch, setShowPanelSearch] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);


  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ widgetId: string; ox: number; oy: number; wx: number; wy: number } | null>(null);
  const resizeRef = useRef<{
    widgetId: string;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    sx_pos: number;
    sy_pos: number;
    dir: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const syncToDatabase = useCallback(async (updatedWidgets: PlacedWidget[]) => {
    if (!currentUser || !currentUser.id) return;
    
    const enriched = updatedWidgets.map(w => ({
      ...w,
      config: getWidgetConfig(w.type, w.id)
    }));

    try {
      const res = await fetch(`${API_BASE}/widgets/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          pageId,
          widgets: enriched
        })
      });
      if (!res.ok) {
        console.error('Failed to sync widgets with database:', res.statusText);
      }
    } catch (err) {
      console.error('Failed to sync widgets with database:', err);
    }
  }, [currentUser, pageId]);

  // Load from DB or local fallback on mount/user/page change
  useEffect(() => {
    const loadWidgets = async () => {
      if (!currentUser || !currentUser.id) {
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            setWidgets(JSON.parse(saved));
          }
        } catch (e) {
          console.error(e);
        }
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/widgets?userId=${currentUser.id}&pageId=${pageId}`);
        if (res.ok) {
          const payload = await res.json();
          const data = payload.data || payload;
          if (Array.isArray(data) && data.length > 0) {
            data.forEach((w: any) => {
              applyWidgetConfig(w.config);
            });
            const loadedWidgets: PlacedWidget[] = data.map((w: any) => ({
              id: w.id,
              type: w.type as WidgetType,
              x: w.x,
              y: w.y,
              w: w.w,
              h: w.h,
              config: w.config
            }));
            setWidgets(loadedWidgets);
            localStorage.setItem(storageKey, JSON.stringify(loadedWidgets));
          } else {
            const saved = localStorage.getItem(storageKey);
            let fallbackWidgets: PlacedWidget[] = [];
            if (saved) {
              fallbackWidgets = JSON.parse(saved);
            } else if (pageId === 'dashboard') {
              const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
              fallbackWidgets = [
                {
                  id: 'default_clock',
                  type: 'clock',
                  x: Math.max(0, Math.round((width - 400) / 2)),
                  y: 140,
                  w: 400,
                  h: 130
                },
                {
                  id: 'default_greeting',
                  type: 'greeting',
                  x: Math.max(0, Math.round((width - 500) / 2)),
                  y: 280,
                  w: 500,
                  h: 100
                },
                {
                  id: 'default_search',
                  type: 'search',
                  x: Math.max(0, Math.round((width - 520) / 2)),
                  y: 390,
                  w: 520,
                  h: 56
                }
              ];
            }
            setWidgets(fallbackWidgets);
            if (fallbackWidgets.length > 0) {
              syncToDatabase(fallbackWidgets);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load widgets from database:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadWidgets();
  }, [currentUser, pageId, storageKey, syncToDatabase]);

  // Persist on change (local storage fallback)
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(widgets));
  }, [widgets, storageKey, syncToDatabase]);

  // Listen to widget config sync events
  useEffect(() => {
    const handleSync = () => {
      setWidgets(prev => {
        const updated = prev.map(w => ({
          ...w,
          config: getWidgetConfig(w.type, w.id)
        }));
        if (currentUser?.id) {
          syncToDatabase(updated);
        }
        return updated;
      });
    };
    window.addEventListener('synctab-widgets-sync', handleSync);
    return () => window.removeEventListener('synctab-widgets-sync', handleSync);
  }, [currentUser, pageId, syncToDatabase]);



  // Close panel/selection on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { 
        setIsPanelOpen(false); 
        setIsEditing(false);
        setSelectedId(null); 
        setActiveMoreMenu(null);
      }
      if (e.key === 'Delete' && selectedId) removeWidget(selectedId);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const save = useCallback((updated: PlacedWidget[]) => {
    setWidgets(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    syncToDatabase(updated);
  }, [storageKey, syncToDatabase]);

  const addWidget = (type: WidgetType, config?: Record<string, unknown>) => {
    const catalog = WIDGET_CATALOG.find(c => c.type === type)!;
    const canvas = canvasRef.current;
    const cx = canvas ? (canvas.clientWidth / 2 - catalog.defaultW / 2) : 60;
    const cy = canvas ? (canvas.clientHeight / 2 - catalog.defaultH / 2) : 60;
    const id = `w_${Date.now()}`;

    // Initialize config in localStorage for bookmarks variants
    if (type === 'bookmarks' && config) {
      if (config.viewMode) {
        let source = 'custom';
        let mode = 'list';
        if (config.viewMode === 'open_tabs') {
          source = 'open_tabs';
          mode = 'list';
        } else if (config.viewMode === 'bookmarks_list') {
          source = 'custom';
          mode = 'list';
        } else if (config.viewMode === 'top_sites') {
          source = 'top_sites';
          mode = 'list';
        } else if (config.viewMode === 'recently_closed') {
          source = 'recently_closed';
          mode = 'list';
        }
        localStorage.setItem(`synctab_bm_source_${id}`, source);
        localStorage.setItem(`synctab_bm_mode_${id}`, mode);
      }
    }

    const newWidget: PlacedWidget = {
      id, type,
      x: snapToGrid(Math.max(0, cx)),
      y: snapToGrid(Math.max(0, cy)),
      w: catalog.defaultW, h: catalog.defaultH,
      config: getWidgetConfig(type, id)
    };
    save([...widgets, newWidget]);
    setIsPanelOpen(false);
  };

  const removeWidget = useCallback((id: string) => {
    save(widgets.filter(w => w.id !== id));
    setSelectedId(null);
    setActiveMoreMenu(null);
  }, [widgets, save]);

  // ── DRAG ────────────────────────────────────────────────────────────────
  const onDragStart = (e: React.MouseEvent, widgetId: string) => {
    if (!isEditing) return;
    e.stopPropagation();
    const w = widgetsRef.current.find(x => x.id === widgetId)!;
    dragRef.current = { widgetId, ox: e.clientX, oy: e.clientY, wx: w.x, wy: w.y };
    setSelectedId(widgetId);
    setActiveMoreMenu(null);
  };

  // ── RESIZE ──────────────────────────────────────────────────────────────
  const onResizeStart = (e: React.MouseEvent, widgetId: string, dir: string = 'se') => {
    e.stopPropagation();
    e.preventDefault();
    const w = widgetsRef.current.find(x => x.id === widgetId)!;
    resizeRef.current = { widgetId, sx: e.clientX, sy: e.clientY, sw: w.w, sh: w.h, sx_pos: w.x, sy_pos: w.y, dir };
  };

  // ── MOUSE MOVE / UP ─────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const currentWidgets = widgetsRef.current;
      if (dragRef.current) {
        const { widgetId, ox, oy, wx, wy } = dragRef.current;
        const canvas = canvasRef.current;
        const wDef = currentWidgets.find(x => x.id === widgetId)!;
        const maxX = canvas ? canvas.clientWidth - wDef.w : 9999;
        const maxY = canvas ? canvas.clientHeight - wDef.h : 9999;
        const nx = snapToGrid(Math.min(maxX, Math.max(0, wx + e.clientX - ox)));
        const ny = snapToGrid(Math.min(maxY, Math.max(0, wy + e.clientY - oy)));
        setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, x: nx, y: ny } : w));
      }
      if (resizeRef.current) {
        const { widgetId, sx, sy, sw, sh, sx_pos, sy_pos, dir } = resizeRef.current;
        const catalog = WIDGET_CATALOG.find(c => c.type === currentWidgets.find(x => x.id === widgetId)?.type)!;
        const canvas = canvasRef.current;
        const maxCanvasW = canvas ? canvas.clientWidth : 9999;
        const maxCanvasH = canvas ? canvas.clientHeight : 9999;

        let nw = sw;
        let nh = sh;
        let nx = sx_pos;
        let ny = sy_pos;

        const dx = e.clientX - sx;
        const dy = e.clientY - sy;

        const minW = catalog.minW;
        const minH = catalog.minH;

        // Horizontal resize
        if (dir.includes('e')) {
          const maxW = maxCanvasW - sx_pos;
          nw = snapToGrid(Math.min(maxW, Math.max(minW, sw + dx)));
        } else if (dir.includes('w')) {
          let newX = sx_pos + dx;
          newX = snapToGrid(newX);
          newX = Math.max(0, Math.min(sx_pos + sw - minW, newX));
          nw = sw + (sx_pos - newX);
          nx = newX;
        }

        // Vertical resize
        if (dir.includes('s')) {
          const maxH = maxCanvasH - sy_pos;
          nh = snapToGrid(Math.min(maxH, Math.max(minH, sh + dy)));
        } else if (dir.includes('n')) {
          let newY = sy_pos + dy;
          newY = snapToGrid(newY);
          newY = Math.max(0, Math.min(sy_pos + sh - minH, newY));
          nh = sh + (sy_pos - newY);
          ny = newY;
        }

        setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, w: nw, h: nh, x: nx, y: ny } : w));
      }
    };
    const onUp = () => {
      if (dragRef.current || resizeRef.current) {
        const latest = widgetsRef.current;
        localStorage.setItem(storageKey, JSON.stringify(latest));
        syncToDatabase(latest);
      }
      dragRef.current = null;
      resizeRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [storageKey, syncToDatabase]);

  // ── DRAG-FROM-PANEL ──────────────────────────────────────────────────────
  const onPanelDragStart = (e: React.DragEvent, type: WidgetType, config?: Record<string, unknown>) => {
    e.dataTransfer.setData('widget-type', type);
    if (config) {
      e.dataTransfer.setData('widget-config', JSON.stringify(config));
    }
  };

  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('widget-type') as WidgetType;
    if (!type) return;
    const configStr = e.dataTransfer.getData('widget-config');
    const config = configStr ? JSON.parse(configStr) : undefined;
    const catalog = WIDGET_CATALOG.find(c => c.type === type)!;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = snapToGrid(Math.max(0, e.clientX - rect.left - catalog.defaultW / 2));
    const y = snapToGrid(Math.max(0, e.clientY - rect.top - catalog.defaultH / 2));
    save([...widgets, { id: `w_${Date.now()}`, type, x, y, w: catalog.defaultW, h: catalog.defaultH, config }]);
  };

  const onCanvasDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  return (
    <div className="wc-root">
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '6px 12px',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.8)',
          zIndex: 100
        }}>
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span>Syncing widgets...</span>
        </div>
      )}
      {/* ── CANVAS ── */}
      <div
        ref={canvasRef}
        className={`wc-canvas ${isEditing || isPanelOpen ? 'editing' : ''}`}
        onClick={() => { setSelectedId(null); setActiveMoreMenu(null); }}
        onDrop={onCanvasDrop}
        onDragOver={onCanvasDragOver}
      >
        {widgets.map(widget => {
          const isSelected = selectedId === widget.id;

          // Check if widget is near screen edges to prevent controls/dropdowns from cutting off
          const isNearBottom = widget.y + widget.h > (typeof window !== 'undefined' ? window.innerHeight : 800) - 80;
          const isNearTop = widget.y < 100;
          const isNearLeft = widget.x < 100;

          const controlBarStyle: React.CSSProperties = isNearBottom
            ? { top: '-42px', bottom: 'auto' }
            : { bottom: '-42px', top: 'auto' };

          const dropdownStyle: React.CSSProperties = {
            position: 'absolute',
            right: isNearLeft ? 'auto' : '0',
            left: isNearLeft ? '0' : 'auto',
            zIndex: 10000,
          };

          if (isNearBottom) {
            // Control bar is at the top, so dropdown should open downwards
            dropdownStyle.top = '34px';
            dropdownStyle.bottom = 'auto';
          } else {
            // Control bar is at the bottom
            if (isNearTop) {
              dropdownStyle.top = '34px';
              dropdownStyle.bottom = 'auto';
            } else {
              dropdownStyle.bottom = '34px';
              dropdownStyle.top = 'auto';
            }
          }

          return (
            <div
              key={widget.id}
              className={`wc-widget ${['bookmarks', 'clock', 'greeting', 'search'].includes(widget.type) ? 'transparent-widget' : ''} ${isEditing ? 'editable' : ''} ${isSelected && isEditing ? 'selected' : ''}`}
              style={{ left: widget.x, top: widget.y, width: widget.w, height: widget.h }}
              onMouseDown={e => onDragStart(e, widget.id)}
              onClick={e => { e.stopPropagation(); if (isEditing) setSelectedId(widget.id); }}
            >
              {/* Widget content */}
              <div className="wc-widget-body">
                <WidgetContent widget={widget} tasks={tasks} bookmarks={bookmarks} currentUser={currentUser} />
              </div>

              {/* Resize helper text */}
              {isSelected && isEditing && (
                <div className="wc-resize-helper-text">Drag corners to resize</div>
              )}

              {/* Resize handles */}
              {isEditing && (
                <>
                  {/* Edges */}
                  <div className="wc-resize-edge wc-resize-n" onMouseDown={e => onResizeStart(e, widget.id, 'n')} />
                  <div className="wc-resize-edge wc-resize-s" onMouseDown={e => onResizeStart(e, widget.id, 's')} />
                  <div className="wc-resize-edge wc-resize-w" onMouseDown={e => onResizeStart(e, widget.id, 'w')} />
                  <div className="wc-resize-edge wc-resize-e" onMouseDown={e => onResizeStart(e, widget.id, 'e')} />

                  {/* Corners */}
                  <div className="wc-resize-corner wc-resize-nw" onMouseDown={e => onResizeStart(e, widget.id, 'nw')} />
                  <div className="wc-resize-corner wc-resize-ne" onMouseDown={e => onResizeStart(e, widget.id, 'ne')} />
                  <div className="wc-resize-corner wc-resize-sw" onMouseDown={e => onResizeStart(e, widget.id, 'sw')} />
                  <div className="wc-resize-corner wc-resize-se" onMouseDown={e => onResizeStart(e, widget.id, 'se')} />
                </>
              )}

              {/* FLOATING CONTROL BAR */}
              {isSelected && isEditing && (
                <div 
                  className="wc-control-bar" 
                  style={controlBarStyle}
                  onMouseDown={e => e.stopPropagation()} 
                  onClick={e => e.stopPropagation()}
                >
                  {/* Configure */}
                  <button 
                    className="wc-ctrl-btn" 
                    title="Configure Widget"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent(`synctab-configure-${widget.id}`, { detail: { widgetId: widget.id } }));
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
                      <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                  </button>

                  {/* Remove */}
                  <button 
                    className="wc-ctrl-btn" 
                    title="Remove Widget"
                    onClick={() => removeWidget(widget.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                  {/* Drag Handle Indicator */}
                  <div 
                    className="wc-ctrl-btn wc-ctrl-drag-handle" 
                    title="Drag to Move"
                    style={{ cursor: 'grab' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" />
                      <polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" />
                      <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
                    </svg>
                  </div>

                  {/* More Options */}
                  <div style={{ position: 'relative' }}>
                    <button 
                      className="wc-ctrl-btn" 
                      title="More Options"
                      onClick={() => setActiveMoreMenu(activeMoreMenu === widget.id ? null : widget.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>

                    {activeMoreMenu === widget.id && (
                      <div className="wc-more-dropdown" style={dropdownStyle}>
                        <button className="wc-dropdown-item" onClick={() => { removeWidget(widget.id); }}>
                          <span style={{ marginRight: 8 }}>🗑</span> REMOVE
                        </button>
                        <button className="wc-dropdown-item" onClick={() => { alert('Example layout presets loaded.'); setActiveMoreMenu(null); }}>
                          <span style={{ marginRight: 8 }}>❓</span> EXAMPLES
                        </button>
                        <button className="wc-dropdown-item" onClick={() => { alert('Widget configuration copied to clipboard.'); setActiveMoreMenu(null); }}>
                          <span style={{ marginRight: 8 }}>📋</span> COPY TO
                        </button>
                        <button className="wc-dropdown-item" onClick={() => {
                          const newWidget: PlacedWidget = {
                            ...widget,
                            id: `w_${Date.now()}`,
                            x: snapToGrid(Math.min(widget.x + 40, window.innerWidth - widget.w)),
                            y: snapToGrid(Math.min(widget.y + 40, window.innerHeight - widget.h)),
                          };
                          save([...widgets, newWidget]);
                          setActiveMoreMenu(null);
                        }}>
                          <span style={{ marginRight: 8 }}>📋</span> DUPLICATE
                        </button>
                        <button className="wc-dropdown-item" onClick={() => { alert('Use mouse dragging or bottom-right corner handles.'); setActiveMoreMenu(null); }}>
                          <span style={{ marginRight: 8 }}>👆</span> MOVE OR RESIZE
                        </button>
                        <button className="wc-dropdown-item" onClick={() => {
                          window.dispatchEvent(new CustomEvent(`synctab-configure-${widget.id}`, { detail: { widgetId: widget.id } }));
                          setActiveMoreMenu(null);
                        }}>
                          <span style={{ marginRight: 8 }}>⚙️</span> CONFIGURE
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {widgets.length === 0 && isEditing && (
          <div className="wc-empty">
            <div style={{ fontSize: '32px' }}>🧩</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>Your canvas is empty</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>Click "＋ Add Widget" to get started</div>
          </div>
        )}
      </div>

      {/* ── WIDGET PANEL (DRAG & DROP WIDGETS) ── */}
      {isPanelOpen && createPortal(
        <div className="wc-panel" onClick={e => e.stopPropagation()}>
          <div className="wc-panel-header">
            <span>Dashboard Customization</span>
            <button onClick={() => setIsPanelOpen(false)} className="wc-panel-close">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <p className="wc-panel-sub" style={{ borderBottom: 'none', padding: '0 20px 8px' }}>Click on, or drag widget icon to desired area.</p>

            {showPanelSearch && (
              <div style={{ padding: '4px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <input 
                  value={panelSearch}
                  onChange={e => setPanelSearch(e.target.value)}
                  placeholder="Search widgets..."
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', color: '#fff', outline: 'none' }}
                  autoFocus
                />
              </div>
            )}

            <div className="wc-panel-list" style={{ padding: '0 16px 16px' }}>
              {WIDGET_CATALOG
                .filter(item => item.label.toLowerCase().includes(panelSearch.toLowerCase()) || item.description.toLowerCase().includes(panelSearch.toLowerCase()))
                .map(item => {
                  const isExpanded = expandedItem === item.type;
                  const hasDropdown = item.type === 'bookmarks';
                  return (
                    <div key={item.type} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div
                        className={`wc-panel-item ${isExpanded ? 'expanded' : ''}`}
                        draggable={!hasDropdown}
                        onDragStart={e => onPanelDragStart(e, item.type)}
                        onClick={() => {
                          if (hasDropdown) {
                            setExpandedItem(isExpanded ? null : item.type);
                          } else {
                            addWidget(item.type);
                          }
                        }}
                      >
                        <div className="wc-panel-icon" style={{ background: item.color + '15', border: `1px solid ${item.color}33` }}>
                          <span style={{ fontSize: '20px' }}>{item.icon}</span>
                        </div>
                        <div className="wc-panel-info">
                          <div className="wc-panel-name">{item.label}</div>
                          <div className="wc-panel-desc">{item.variants}</div>
                        </div>
                        <div className="wc-panel-chevron" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>

                      {isExpanded && item.type === 'bookmarks' && (
                        <div className="wc-panel-sub-list">
                          {[
                            { label: 'Open Tabs', icon: '🌐', viewMode: 'open_tabs' },
                            { label: 'New Bookmark List', icon: '🔖', viewMode: 'bookmarks_list' },
                            { label: 'Top Sites', icon: '⭐', viewMode: 'top_sites' },
                            { label: 'Recently Closed', icon: '🕒', viewMode: 'recently_closed' }
                          ].map(sub => (
                            <div
                              key={sub.viewMode}
                              className="wc-panel-sub-item"
                              draggable
                              onDragStart={e => onPanelDragStart(e, 'bookmarks', { viewMode: sub.viewMode })}
                              onClick={() => addWidget('bookmarks', { viewMode: sub.viewMode })}
                            >
                              <span className="wc-panel-sub-icon">{sub.icon}</span>
                              <span className="wc-panel-sub-label">{sub.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="wc-panel-footer">
              <button className="wc-footer-btn" onClick={() => setIsPanelOpen(false)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                CLOSE
              </button>
              <button className="wc-footer-btn" onClick={() => { setPanelSearch(''); setShowPanelSearch(false); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
                ALL WIDGETS
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WidgetCanvas;
