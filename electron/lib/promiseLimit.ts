interface TaskState {
  state: 'ok' | 'error' | 'existed'
  url
}
export class TaskManager {
  tasks: (() => Promise<TaskState>)[] = []
  res: TaskState[] = []
  paused = false
  constructor(segments: any[]) {
    //
    this.tasks = segments
    console.log('TaskManager', this.tasks.length)
  }

  generateTask(index: number) {
    return () => new Promise<number>((resolve) => { // Include 'void' as the argument in the Promise constructor
      setTimeout(() => {
        console.log('Task done', index)
        resolve(index)
      }, Math.random() * 100)
    })
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
    this.run(5).then(() => {
      const results = this.res
      const errorCount = results.map((item, index) => item.state === 'error' ? index : null).filter(item => item !== null)
      const okCount = results.map((item, index) => item.state === 'ok' ? index : null).filter(item => item !== null)
      console.log('task ok', okCount.length)
      console.log('task error', errorCount.length)
    }).catch((error) => {
      console.error(error)
      // Logger.error('[download] error', error)
    })
  }

  run(limit = 5) {
    console.log('run')
    return new Promise<void>((resolve, reject) => {
      let running = 0
      let index = 0
      const next = () => {
        if (this.paused) {
          if (running === 0) {
            console.log('paused', this.res.length)
            resolve()
          }
          return
        }
        if (running >= limit)
          return

        if (index >= this.tasks.length) {
          if (running === 0)
            resolve()
          return
        }
        running++
        const task = this.tasks[index]
        task().then((res: TaskState) => {
          this.res.push(res)
          running--
          next()
        }).catch((error) => {
          reject(error)
        })
        index++
        next()
      }
      next()
    })
  }
}
