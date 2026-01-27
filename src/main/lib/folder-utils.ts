import * as fs from 'node:fs'
import * as path from 'node:path'

export interface ConflictResolution {
  originalName: string
  resolvedName: string
  resolutionMethod: 'suffix' | 'taskId'
  folderPath: string
}

export function resolveFolderConflict(
  baseDir: string,
  desiredName: string,
  taskId: string,
): ConflictResolution {
  const targetPath = path.join(baseDir, desiredName)

  // No conflict
  if (!fs.existsSync(targetPath)) {
    return {
      originalName: desiredName,
      resolvedName: desiredName,
      resolutionMethod: 'suffix',
      folderPath: targetPath,
    }
  }

  // Conflict exists - try appending suffix
  let counter = 1
  let resolvedName: string

  while (true) {
    resolvedName = `${desiredName}_${counter}`
    const candidatePath = path.join(baseDir, resolvedName)

    if (!fs.existsSync(candidatePath)) {
      return {
        originalName: desiredName,
        resolvedName,
        resolutionMethod: 'suffix',
        folderPath: candidatePath,
      }
    }

    counter++

    // Safety limit - use task ID if too many conflicts
    if (counter > 999) {
      resolvedName = taskId
      const taskPath = path.join(baseDir, resolvedName)
      return {
        originalName: desiredName,
        resolvedName,
        resolutionMethod: 'taskId',
        folderPath: taskPath,
      }
    }
  }
}

export function sanitizeFolderName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/^\.+/, '')
    .replace(/\s+/g, '_')
    .slice(0, 200)
}
