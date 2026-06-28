export type WidgetType =
  | 'clock'
  | 'calendar'
  | 'weather'
  | 'search'
  | 'notes'
  | 'quotes'
  | 'tasks'
  | 'bookmarks'
  | 'countdown'
  | 'stocks';

export interface PlacedWidget {
  id: string;
  type: WidgetType;
  x: number;   // px from left of canvas
  y: number;   // px from top of canvas
  w: number;   // px width
  h: number;   // px height
  config?: Record<string, unknown>;
}

export interface CatalogItem {
  type: WidgetType;
  label: string;
  description: string;
  icon: string;
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
  color: string;
  variants: string;
}

export const WIDGET_CATALOG: CatalogItem[] = [
  { type: 'clock',     label: 'Date & Time',                description: 'Live time, date and greeting',     icon: '🕐', defaultW: 240, defaultH: 120, minW: 160, minH: 80,  color: '#8b5cf6', variants: '+3 widget variants' },
  { type: 'weather',   label: 'Weather Forecast',           description: 'Current weather and conditions',   icon: '⛅', defaultW: 260, defaultH: 130, minW: 200, minH: 100, color: '#06b6d4', variants: '+8 widget variants' },
  { type: 'bookmarks', label: 'Bookmarks, Top Sites...',     description: 'Quick launch links and views',     icon: '🔖', defaultW: 300, defaultH: 200, minW: 60, minH: 120, color: '#14b8a6', variants: '+6 widget variants' },
  { type: 'calendar',  label: 'Calendar & Agenda',          description: 'Monthly calendar view & events',   icon: '📅', defaultW: 300, defaultH: 290, minW: 240, minH: 230, color: '#3b82f6', variants: '+6 widget variants' },
  { type: 'search',    label: 'Search box',                 description: 'Quick web search input bar',       icon: '🔍', defaultW: 380, defaultH: 56,  minW: 200, minH: 48,  color: '#10b981', variants: '+2 widget variants' },
  { type: 'notes',     label: 'Note & Checklist',           description: 'Quick sticky note and checklist',  icon: '📝', defaultW: 260, defaultH: 220, minW: 180, minH: 140, color: '#f59e0b', variants: '+3 widget variants' },
  { type: 'quotes',    label: 'Quotes & Inspiration',       description: 'Daily quotes and thoughts',        icon: '💬', defaultW: 300, defaultH: 150, minW: 200, minH: 100, color: '#ec4899', variants: '+3 widget variants' },
  { type: 'tasks',     label: 'Tasks & Reminders',          description: 'Pending task and todo list',       icon: '✅', defaultW: 270, defaultH: 250, minW: 180, minH: 160, color: '#f97316', variants: '+4 widget variants' },
  { type: 'countdown', label: 'Countdown Timer',            description: 'Countdown to a custom event',      icon: '⏳', defaultW: 260, defaultH: 110, minW: 200, minH: 90,  color: '#e11d48', variants: '+3 widget variants' },
  { type: 'stocks',    label: 'Stocks & Markets',           description: 'Real-time stock ticker watch',     icon: '📈', defaultW: 240, defaultH: 180, minW: 180, minH: 120, color: '#10b981', variants: '+3 widget variants' },
];

export const GRID_SNAP = 10;
export const snapToGrid = (v: number) => Math.round(v / GRID_SNAP) * GRID_SNAP;

export const STORAGE_KEY = 'synctab_widget_layout';
