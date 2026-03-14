import Logger from 'electron-log'
import type { TaskCreationOptions, TaskItem, TaskStatus, TaskUpdateOptions } from '../../shared/types'
import { jsondb } from '../lib/jsondb'

/**
 * Task repository interface
 */
export interface ITaskRepository {
  save: (task: TaskItem) => Promise<void>
  findById: (taskId: string) => Promise<TaskItem | null>
  findAll: () => Promise<TaskItem[]>
  findByStatus: (status: TaskStatus) => Promise<TaskItem[]>
  findByUrl: (url: string) => Promise<TaskItem | null>
  update: (taskId: string, updates: TaskUpdateOptions) => Promise<void>
  updateStatus: (taskId: string, status: TaskStatus) => Promise<void>
  delete: (taskId: string) => Promise<void>
  deleteAll: () => Promise<void>
  count: () => Promise<number>
  exists: (taskId: string) => Promise<boolean>
}

/**
 * Task repository implementation using JSONDB
 */
export class TaskRepository implements ITaskRepository {
  /**
   * Save a task to the database
   */
  async save(task: TaskItem): Promise<void> {
    try {
      await jsondb.update(task)
      Logger.info(`[TaskRepository] Task saved: ${task.taskId}`)
    }
    catch (error) {
      Logger.error('[TaskRepository] Failed to save task:', error)
      throw error
    }
  }

  /**
   * Find a task by ID
   */
  async findById(taskId: string): Promise<TaskItem | null> {
    try {
      const db = await jsondb.getDB()
      const task = db.tasks.find(t => t.taskId === taskId)
      return task || null
    }
    catch (error) {
      Logger.error('[TaskRepository] Failed to find task by ID:', error)
      throw error
    }
  }

  /**
   * Get all tasks
   */
  async findAll(): Promise<TaskItem[]> {
    try {
      const db = await jsondb.getDB()
      return db.tasks || []
    }
    catch (error) {
      Logger.error('[TaskRepository] Failed to get all tasks:', error)
      throw error
    }
  }

  /**
   * Find tasks by status
   */
  async findByStatus(status: TaskStatus): Promise<TaskItem[]> {
    try {
      const tasks = await this.findAll()
      return tasks.filter(task => task.status === status)
    }
    catch (error) {
      Logger.error('[TaskRepository] Failed to find tasks by status:', error)
      throw error
    }
  }

  /**
   * Find a task by URL
   */
  async findByUrl(url: string): Promise<TaskItem | null> {
    try {
      const tasks = await this.findAll()
      const task = tasks.find(t => t.url === url)
      return task || null
    }
    catch (error) {
      Logger.error('[TaskRepository] Failed to find task by URL:', error)
      throw error
    }
  }

  /**
   * Update a task
   */
  async update(taskId: string, updates: TaskUpdateOptions): Promise<void> {
    try {
      const task = await this.findById(taskId)
      if (!task) {
        throw new Error(`Task not found: ${taskId}`)
      }

      const updatedTask = { ...task, ...updates }
      await this.save(updatedTask)
      Logger.info(`[TaskRepository] Task updated: ${taskId}`)
    }
    catch (error) {
      Logger.error('[TaskRepository] Failed to update task:', error)
      throw error
    }
  }

  /**
   * Update task status
   */
  async updateStatus(taskId: string, status: TaskStatus): Promise<void> {
    try {
      await this.update(taskId, { status })
      Logger.info(`[TaskRepository] Task status updated: ${taskId} -> ${status}`)
    }
    catch (error) {
      Logger.error('[TaskRepository] Failed to update task status:', error)
      throw error
    }
  }

  /**
   * Delete a task by ID
   */
  async delete(taskId: string): Promise<void> {
    try {
      const db = await jsondb.getDB()
      db.tasks = db.tasks.filter(task => task.taskId !== taskId)
      await jsondb.db.write()
      Logger.info(`[TaskRepository] Task deleted: ${taskId}`)
    }
    catch (error) {
      Logger.error('[TaskRepository] Failed to delete task:', error)
      throw error
    }
  }

  /**
   * Delete all tasks
   */
  async deleteAll(): Promise<void> {
    try {
      jsondb.db.data.tasks = []
      await jsondb.db.write()
      Logger.info('[TaskRepository] All tasks deleted')
    }
    catch (error) {
      Logger.error('[TaskRepository] Failed to delete all tasks:', error)
      throw error
    }
  }

  /**
   * Count all tasks
   */
  async count(): Promise<number> {
    try {
      const tasks = await this.findAll()
      return tasks.length
    }
    catch (error) {
      Logger.error('[TaskRepository] Failed to count tasks:', error)
      throw error
    }
  }

  /**
   * Check if a task exists
   */
  async exists(taskId: string): Promise<boolean> {
    try {
      const task = await this.findById(taskId)
      return task !== null
    }
    catch (error) {
      Logger.error('[TaskRepository] Failed to check task existence:', error)
      throw error
    }
  }
}

// Export singleton instance
export const taskRepository = new TaskRepository()
