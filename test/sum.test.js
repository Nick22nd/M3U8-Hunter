import path from 'node:path'
import os from 'node:os'
import { expect, it } from 'vitest'
import { getAppDataDir } from '../electron/lib/utils'
import { TaskManager } from '../electron/lib/promiseLimit'
import { sum } from './sum'

it('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})

it('app directory path', () => {
  expect(getAppDataDir()).toBe(path.join(os.homedir(), 'M3U8Hunter'))
})

function generateTask(index) {
  return () => new Promise((resolve) => { // Include 'void' as the argument in the Promise constructor
    setTimeout(() => {
      // console.log('Task done', index)
      resolve(index)
    }, Math.random() * 10)
  })
}
const tasks = Array.from({
  length: 100,
}, (_, i) => generateTask(i))
const taskM = new TaskManager(tasks)

it('taskManager', async () => {
  await taskM.run(5).then(() => {
    console.log('taskM.res.length', taskM.res.length)
  })
  expect(taskM.res.length).toBe(100)
  expect(taskM.res.sort((a, b) => a - b)[0]).toBe(0)
})
