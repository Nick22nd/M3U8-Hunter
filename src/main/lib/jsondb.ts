import { JSONFilePreset } from 'lowdb/node'

interface Data {
  tasks: TaskItem[]
}
interface TaskItem {
  url: string
  headers: {
    [key: string]: string
  }
  status: 'downloading' | 'downloaded' | 'failed'
}

const defaultData: Data = { tasks: [] }
// export const db = await JSONFilePreset<Data>('db.json', defaultData)
class JSONDB {
  db = null
  constructor() {
    this.init()
  }

  async init() {
    this.db = await JSONFilePreset<Data>('db.json', defaultData)
  }

  public async update(task: TaskItem) {
    try {
      await this.db.update(({ tasks }) => {
        tasks.push(task)
      })
    }
    catch (error) {
      console.log('error', error)
    }
  }

  public async get() {
    return this.db.read()
  }
}
export const jsondb = new JSONDB()
