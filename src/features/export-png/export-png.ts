export { captureStageDataUrlAtFit, exportStageToPngAtFit } from './export-stage-fit'

export function buildExportFilename(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${prefix}-${date}.png`
}
