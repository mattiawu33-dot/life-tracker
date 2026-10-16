/**
 * System notifications (the pop-ups outside the browser window). Used as a
 * fallback for reminders while the app is open. Asking is only allowed right
 * after the user does something, like picking a reminder.
 */
export function canNotify(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

export function askForNotifications(): void {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }
}

export function notify(title: string, body: string): void {
  if (!canNotify()) return
  try {
    new Notification(title, { body, icon: '/favicon.svg', tag: title + body })
  } catch {
    // Some browsers (e.g. Android Chrome) only allow notifications from a service worker.
  }
}
