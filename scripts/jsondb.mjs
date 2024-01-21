import { JSONFilePreset } from 'lowdb/node'

// interface Data {
//   tasks: TaskItem[]
// }
// interface TaskItem {
//   url: string
//   headers: {
//     [key: string]: string
//   }
//   status: 'downloading' | 'downloaded' | 'failed'
// }

const defaultData = { tasks: [] }
// export const db = await JSONFilePreset<Data>('db.json', defaultData)
class JSONDB {
  async init() {
    this.db = await JSONFilePreset('db.json', defaultData)
  }

  async update(task) {
    try {
      await this.db.update(({ tasks }) => {
        tasks.push(task)
      })
    }
    catch (error) {
      console.log('error', error)
    }
  }

  async get() {
    return this.db.data
  }
}
export const jsondb = new JSONDB()
jsondb.init()
