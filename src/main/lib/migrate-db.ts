import Logger from 'electron-log'
import { jsondb } from './jsondb'

export interface MigrationResult {
  success: boolean
  migratedCount: number
  totalTasks: number
  message: string
}

export async function migrateLegacyTasks(): Promise<MigrationResult> {
  try {
    const data = await jsondb.getDB()
    const tasks = data.tasks as any[]
    const totalTasks = tasks.length

    let migratedCount = 0
    const newTasks = tasks.map((task) => {
      if (task.createTime && !task.taskId) {
        Logger.info(`Migrating task: ${task.name}`)
        migratedCount++
        return {
          ...task,
          taskId: task.createTime.toString(),
          createdAt: task.createTime, // Keep for sorting
          createTime: undefined, // Remove legacy property
        }
      }
      return task
    })

    if (migratedCount > 0) {
      jsondb.db.data.tasks = newTasks
      await jsondb.db.write()
      Logger.info(`Migrated ${migratedCount} tasks to new ID format`)
      return {
        success: true,
        migratedCount,
        totalTasks,
        message: `Successfully migrated ${migratedCount} tasks out of ${totalTasks}`,
      }
    }
    else {
      return {
        success: true,
        migratedCount: 0,
        totalTasks,
        message: 'No tasks require migration',
      }
    }
  }
  catch (error) {
    Logger.error('Migration failed:', error)
    return {
      success: false,
      migratedCount: 0,
      totalTasks: 0,
      message: error instanceof Error ? error.message : 'Migration failed',
    }
  }
}
