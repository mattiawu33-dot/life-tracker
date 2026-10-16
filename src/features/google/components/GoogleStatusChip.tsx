import { CloudOff, Loader2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import { useGoogle } from '../context'

/** Small sync indicator for the calendar toolbar. */
export function GoogleStatusChip() {
  const g = useGoogle()
  const chip = 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium'

  if (g.status === 'not-configured' || g.status === 'off') {
    return (
      <Link to="/settings" className={`${chip} text-ink-muted hover:bg-surface-2 hover:text-ink`}>
        <GoogleDot /> Connect Google
      </Link>
    )
  }
  if (g.status === 'needs-auth' || g.status === 'connecting') {
    return (
      <button type="button" onClick={g.connect} className={`${chip} bg-accent-soft text-accent-ink hover:opacity-80`} title="Google sign-in expired. Changes are saved and will sync.">
        {g.status === 'connecting' ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        Reconnect Google
      </button>
    )
  }
  if (g.status === 'error') {
    return (
      <button type="button" onClick={g.syncNow} className={`${chip} text-danger hover:bg-danger-soft`} title={g.error ?? ''}>
        <CloudOff className="size-3.5" /> Sync problem · retry
      </button>
    )
  }
  return (
    <button type="button" onClick={g.syncNow} className={`${chip} text-ink-muted hover:bg-surface-2 hover:text-ink`} title="Sync now">
      {g.status === 'syncing' ? <Loader2 className="size-3.5 animate-spin" /> : <GoogleDot />}
      {g.status === 'syncing' ? 'Syncing' : 'Synced'}
    </button>
  )
}

function GoogleDot() {
  return <span className="size-2 rounded-full bg-[conic-gradient(#4285f4_0_25%,#34a853_0_50%,#fbbc05_0_75%,#ea4335_0)]" aria-hidden />
}
