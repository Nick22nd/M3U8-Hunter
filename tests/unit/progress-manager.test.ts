import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProgressManager } from '../../src/main/core/progress-manager'

describe('ProgressManager', () => {
  let progressManager: ProgressManager

  beforeEach(() => {
    progressManager = ProgressManager.getInstance()
    progressManager.clear()
  })

  describe('task registration', () => {
    it('should register a task', () => {
      const taskId = 'task1'
      progressManager.registerTask(taskId, {
        total: 100,
        downloaded: 0,
        status: 'downloading',
      })

      const task = progressManager.getTask(taskId)
      expect(task).toBeDefined()
      expect(task?.taskId).toBe(taskId)
      expect(task?.total).toBe(100)
    })

    it('should throw error when registering duplicate task', () => {
      const taskId = 'task1'

      progressManager.registerTask(taskId, {
        total: 100,
        downloaded: 0,
        status: 'downloading',
      })

      expect(() => {
        progressManager.registerTask(taskId, {
          total: 100,
          downloaded: 0,
          status: 'downloading',
        })
      }).toThrow()
    })
  })

  describe('progress updates', () => {
    it('should update task progress', () => {
      const taskId = 'task1'

      progressManager.registerTask(taskId, {
        total: 100,
        downloaded: 0,
        status: 'downloading',
      })

      progressManager.updateProgress(taskId, {
        downloaded: 50,
      })

      const task = progressManager.getTask(taskId)
      expect(task?.downloaded).toBe(50)
      expect(task?.progress).toBe(50)
    })

    it('should handle batch progress updates', () => {
      const taskId1 = 'task1'
      const taskId2 = 'task2'

      progressManager.registerTask(taskId1, {
        total: 100,
        downloaded: 0,
        status: 'downloading',
      })

      progressManager.registerTask(taskId2, {
        total: 50,
        downloaded: 0,
        status: 'downloading',
      })

      progressManager.batchUpdateProgress([
        { taskId: taskId1, downloaded: 75 },
        { taskId: taskId2, downloaded: 25 },
      ])

      const task1 = progressManager.getTask(taskId1)
      const task2 = progressManager.getTask(taskId2)

      expect(task1?.downloaded).toBe(75)
      expect(task2?.downloaded).toBe(25)
    })
  })

  describe('task completion', () => {
    it('should mark task as completed', () => {
      const taskId = 'task1'

      progressManager.registerTask(taskId, {
        total: 100,
        downloaded: 0,
        status: 'downloading',
      })

      progressManager.completeTask(taskId)

      const task = progressManager.getTask(taskId)
      expect(task?.status).toBe('completed')
      expect(task?.progress).toBe(100)
    })
  })

  describe('task removal', () => {
    it('should unregister task', () => {
      const taskId = 'task1'

      progressManager.registerTask(taskId, {
        total: 100,
        downloaded: 0,
        status: 'downloading',
      })

      progressManager.unregisterTask(taskId)

      const task = progressManager.getTask(taskId)
      expect(task).toBeUndefined()
    })
  })

  describe('task statistics', () => {
    it('should provide task statistics', () => {
      const taskId1 = 'task1'
      const taskId2 = 'task2'

      progressManager.registerTask(taskId1, {
        total: 100,
        downloaded: 50,
        status: 'downloading',
      })

      progressManager.registerTask(taskId2, {
        total: 50,
        downloaded: 25,
        status: 'downloading',
      })

      const stats = progressManager.getStatistics()

      expect(stats.totalTasks).toBe(2)
      expect(stats.activeTasks).toBe(2)
      expect(stats.completedTasks).toBe(0)
      expect(stats.averageProgress).toBeCloseTo(37.5)
    })
  })

  describe('batch update interval', () => {
    it('should respect batch update interval', () => {
      const taskId = 'task1'

      progressManager.registerTask(taskId, {
        total: 100,
        downloaded: 0,
        status: 'downloading',
      })

      progressManager.updateProgress(taskId, { downloaded: 10 })
      progressManager.updateProgress(taskId, { downloaded: 20 })
      progressManager.updateProgress(taskId, { downloaded: 30 })

      const task = progressManager.getTask(taskId)
      expect(task?.downloaded).toBe(30)
    })
  })

  describe('performance', () => {
    it('should handle multiple concurrent tasks efficiently', () => {
      const taskCount = 100

      for (let i = 0; i < taskCount; i++) {
        progressManager.registerTask(`task${i}`, {
          total: 100,
          downloaded: 0,
          status: 'downloading',
        })
      }

      const stats = progressManager.getStatistics()
      expect(stats.totalTasks).toBe(taskCount)
    })
  })
})
