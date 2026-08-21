import { OfficeWidget } from '@/components/team-studio/OfficeWidget'
import { TeamStudio } from '@/components/team-studio/TeamStudio'
import { StudioLocaleProvider } from '@/lib/team-studio/i18n'

export function App() {
  const view = new URLSearchParams(window.location.search).get('view')
  return <StudioLocaleProvider>{view === 'widget' ? <OfficeWidget /> : <TeamStudio />}</StudioLocaleProvider>
}
