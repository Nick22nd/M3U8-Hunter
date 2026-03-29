import { describe, expect, it } from 'vitest'
import { normalizePersistedTask, repairPersistedTasks } from '../../src/main/lib/task-normalizer'

describe('task-normalizer', () => {
  it('fills missing taskId and display name for malformed tasks', () => {
    const task = normalizePersistedTask({
      url: '',
      title: '',
      name: '',
      headers: null as any,
      status: 'mystery' as any,
    })

    expect(task.taskId).toBeTruthy()
    expect(task.name).toMatch(/^未命名任务-/)
    expect(task.headers).toEqual({})
    expect(task.status).toBe('unfinished')
  })

  it('deduplicates by task identity and keeps richer task data', () => {
    const { tasks } = repairPersistedTasks([
      {
        taskId: 'abc',
        url: 'https://example.com/a.m3u8',
        status: 'failed',
        headers: {},
      },
      {
        taskId: 'abc',
        url: 'https://example.com/a.m3u8',
        directory: 'D:/video/a',
        progress: '1/10',
        name: 'video-a',
        status: 'failed',
        headers: {},
      },
    ])

    expect(tasks).toHaveLength(1)
    expect(tasks[0].directory).toBe('D:/video/a')
    expect(tasks[0].name).toBe('video-a')
    expect(tasks[0].progress).toBe('1/10')
  })

  it('marks fully downloaded tasks as downloaded during repair', () => {
    const { tasks } = repairPersistedTasks([
      {
        taskId: 'done-1',
        url: 'https://example.com/done.m3u8',
        status: 'failed',
        segmentCount: 12,
        downloadedCount: 12,
        headers: {},
      },
    ])

    expect(tasks[0].status).toBe('downloaded')
  })
})