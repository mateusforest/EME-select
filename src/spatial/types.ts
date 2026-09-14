import type { Group } from 'three'

export interface CameraPose {
  position: [number, number, number]
  target: [number, number, number]
  fov?: number
}

export interface SpatialScene {
  group: Group
  hotspots: { id: string; label: string; position: [number, number, number] }[]
  views: Record<string, CameraPose>
  clearColor: string
  isInterior?: boolean
  dispose?: () => void
}
