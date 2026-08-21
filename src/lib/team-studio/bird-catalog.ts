export type BirdProfile = {
  id: string
  species: string
  archetype: 'speed' | 'strategy' | 'craft' | 'reliability'
}

export const BIRD_CATALOG: BirdProfile[] = [
  { id: 'albatross', species: 'Albatross', archetype: 'strategy' },
  { id: 'bowerbird', species: 'Bowerbird', archetype: 'craft' },
  { id: 'crane', species: 'Red-crowned Crane', archetype: 'strategy' },
  { id: 'crow', species: 'Crow', archetype: 'strategy' },
  { id: 'falcon', species: 'Peregrine Falcon', archetype: 'speed' },
  { id: 'hummingbird', species: 'Hummingbird', archetype: 'speed' },
  { id: 'lorikeet', species: 'Rainbow Lorikeet', archetype: 'craft' },
  { id: 'magpie', species: 'Magpie', archetype: 'craft' },
  { id: 'nutcracker', species: "Clark's Nutcracker", archetype: 'reliability' },
  { id: 'pigeon', species: 'Homing Pigeon', archetype: 'reliability' },
  { id: 'raven', species: 'Raven', archetype: 'strategy' },
  { id: 'sparrow', species: 'Sparrow', archetype: 'reliability' },
  { id: 'starling', species: 'Starling', archetype: 'reliability' },
  { id: 'swallow', species: 'Swallow', archetype: 'speed' },
  { id: 'swift', species: 'Swift', archetype: 'speed' },
  { id: 'tern', species: 'Arctic Tern', archetype: 'reliability' },
  { id: 'tit', species: 'Long-tailed Tit', archetype: 'craft' },
]

export const BIRD_ASSIGNMENTS_STORAGE_KEY = 'pixel-team-studio:bird-assignments:v1'
