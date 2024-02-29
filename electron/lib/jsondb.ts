import { JSONFilePreset } from 'lowdb/node'
import { getAppDataDir } from './m3u8.app'
import { join } from 'node:path'
interface Data {
  tasks: TaskItem[]
}
interface TaskItem {
  url: string
  headers: {
    [key: string]: string
  }
  status: 'downloading' | 'downloaded' | 'failed',
  duration?: number
  durationStr?: string

}

const defaultData: Data = { tasks: [] }

// export const db = await JSONFilePreset<Data>('db.json', defaultData)
class JSONDB {
  db = null
  constructor() {
    this.init()
  }

  async init() {
    this.db = await JSONFilePreset<Data>(join(getAppDataDir(), 'db.json'), defaultData)
  }
  public async removeDuplicate() {
    const tasks = this.db.data.tasks
    const newTasks = tasks.filter((item, index) => {
      const _index = tasks.findIndex((i) => i.url === item.url)
      return _index === index
    })
    this.db.data.tasks = newTasks
    await this.db.write()
  }
  public async update(task: TaskItem) {
    try {

      const isExist = this.db.data.tasks.some((item) => item.url === task.url)
      if (isExist) {
        this.db.data.tasks = this.db.data.tasks.map((item) => item.url === task.url ? task : item)
      } else {
        this.db.data.tasks.push(task)
      }
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