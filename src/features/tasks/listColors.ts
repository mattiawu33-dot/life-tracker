import type { ListColor } from './types'

/**
 * Mid-tone colors that read well on both light and dark backgrounds. We store
 * the name ("teal"), not the hex code, so the palette can be tuned later
 * without touching saved data.
 */
export const LIST_COLORS: Record<ListColor, { hex: string; label: string }> = {
  red: { hex: '#ef4444', label: 'Red' },
  orange: { hex: '#f97316', label: 'Orange' },
  amber: { hex: '#eab308', label: 'Yellow' },
  green: { hex: '#22c55e', label: 'Green' },
  teal: { hex: '#14b8a6', label: 'Teal' },
  sky: { hex: '#0ea5e9', label: 'Sky' },
  indigo: { hex: '#6366f1', label: 'Indigo' },
  violet: { hex: '#a855f7', label: 'Violet' },
  pink: { hex: '#ec4899', label: 'Pink' },
  slate: { hex: '#64748b', label: 'Gray' },
}

export const LIST_COLOR_KEYS = Object.keys(LIST_COLORS) as ListColor[]
