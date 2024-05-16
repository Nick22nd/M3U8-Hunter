import { join } from 'node:path'
import { JSONFilePreset } from 'lowdb/node'
import Logger from 'electron-log'
import type { TaskItem } from '../common.types'
import { getAppDataDir } from './utils'

interface Data {
  tasks: TaskItem[]
}

const defaultData: Data = { tasks: [] }

// export const db = await JSONFilePreset<Data>('db.json', defaultData)
class JSONDB {
  db = null
  constructor() {
    this.init()
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

  public async removeDuplicate() {
    const tasks = this.db.data.tasks
    const newTasks = tasks.filter((item, index) => {
      const _index = tasks.findIndex(i => i.url === item.url)
      return _index === index
    })
    this.db.data.tasks = newTasks
    await this.db.write()
  }

  public async update(task: TaskItem) {
    // console.log('update', task)
    try {
      const isExist = this.db.data.tasks.some(item => item.url === task.url)
      if (isExist)
        this.db.data.tasks = this.db.data.tasks.map(item => item.url === task.url ? task : item)
      else
        this.db.data.tasks.push(task)

      await this.db.write()
    }
    catch (error) {
      console.log('error', error)
    }
  }

  public async getDB() {
    this.removeDuplicate()
    return this.db.data
  }
}
export const jsondb = new JSONDB()
