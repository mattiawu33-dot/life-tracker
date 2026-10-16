import { PageHeader } from '../components/ui/PageHeader'
import { Segmented } from '../components/ui/Segmented'
import { GoogleSettings } from '../features/google/components/GoogleSettings'
import { TrainerSettings } from '../features/trainer/components/TrainerSettings'
import { useTheme, type ThemePreference } from '../theme/theme'

export function SettingsPage() {
  const { preference, setPreference } = useTheme()
  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card">
          <h2 className="font-semibold">Appearance</h2>
          <Segmented<ThemePreference>
            label="Theme"
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </section>
        <GoogleSettings />
        <TrainerSettings />
      </div>
    </>
  )
}
