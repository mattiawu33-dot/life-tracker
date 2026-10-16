/**
 * Google Calendar settings.
 *
 * VITE_GOOGLE_CLIENT_ID is the OAuth "Web application" client ID from Google
 * Cloud. It is meant to be public (it's visible in every Sign in with Google
 * button on the web), so it's fine in frontend code. There is no client
 * secret in this app. Variables starting with VITE_ are baked in at build
 * time, so redeploy after changing it.
 */
export const GOOGLE_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()

export const GOOGLE_SCOPES = [
  // Create, change and delete events on your calendars
  'https://www.googleapis.com/auth/calendar.events',
  // See your list of calendars and their colors
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
].join(' ')
