import { join } from 'node:path'
import { JSONFilePreset } from 'lowdb/node'
import Logger from 'electron-log'
import type { TaskItem } from '../common.types'
import { getAppDataDir } from './utils'
import { repairPersistedTasks } from './task-normalizer'

interface Data {
  tasks: TaskItem[]
}

const defaultData: Data = { tasks: [] }

// export const db = await JSONFilePreset<Data>('db.json', defaultData)
class JSONDB {
  db = null
  private initPromise: Promise<void>

  constructor() {
    this.initPromise = this.init()
  }

  async init() {
    try {
      // console.log('before init jsondb', import.meta.env)
      const dir = getAppDataDir()
      Logger.info('init jsondb', dir)
      this.db = await JSONFilePreset<Data>(join(dir, 'db.json'), defaultData)
    }
    catch (error) {
      Logger.error('init jsondb error', error)
    }
  }

  private async ensureReady() {
    await this.initPromise
    if (!this.db)
      throw new Error('JSON database is not initialized')
  }

  private async repairTasks() {
    await this.ensureReady()
    const currentTasks = this.db.data.tasks as Partial<TaskItem>[]
    const { tasks, changed } = repairPersistedTasks(currentTasks)

    if (changed) {
      this.db.data.tasks = tasks
      await this.db.write()
      Logger.info(`[JSONDB] Repaired persisted task data: ${tasks.length} tasks`) 
    }
  }

  public async update(task: TaskItem) {
    // console.log('update', task)
    try {
      await this.ensureReady()
      const isExist = this.db.data.tasks.some(item => item.taskId === task.taskId)
      if (isExist)
        this.db.data.tasks = this.db.data.tasks.map(item => item.taskId === task.taskId ? task : item)
      else
        this.db.data.tasks.push(task)

      await this.db.write()
    }
    catch (error) {
      console.log('error', error)
    }
  }

  public async getDB() {
    await this.repairTasks()
    return this.db.data
  }
}
export const jsondb = new JSONDB()
