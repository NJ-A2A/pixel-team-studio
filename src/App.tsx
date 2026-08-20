import { OfficeWidget } from '@/components/team-studio/OfficeWidget'
import { TeamStudio } from '@/components/team-studio/TeamStudio'

export function App() {
  const view = new URLSearchParams(window.location.search).get('view')
  return view === 'widget' ? <OfficeWidget /> : <TeamStudio />
}
