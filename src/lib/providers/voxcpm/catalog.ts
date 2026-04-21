import { registerOfficialModel } from '@/lib/providers/official/model-registry'
import type { OfficialModelModality } from '@/lib/providers/official/model-registry'

const VOXCPM_CATALOG: Readonly<Record<OfficialModelModality, readonly string[]>> = {
  llm: [],
  image: [],
  video: [],
  audio: [
    'voxcpm-2',
    'voxcpm-1.5',
  ],
}

let initialized = false

export function ensureVoxCPMCatalogRegistered(): void {
  if (initialized) return
  initialized = true
  for (const modality of Object.keys(VOXCPM_CATALOG) as OfficialModelModality[]) {
    for (const modelId of VOXCPM_CATALOG[modality]) {
      registerOfficialModel({ provider: 'voxcpm', modality, modelId })
    }
  }
}

export function listVoxCPMCatalogModels(modality: OfficialModelModality): readonly string[] {
  ensureVoxCPMCatalogRegistered()
  return VOXCPM_CATALOG[modality]
}
