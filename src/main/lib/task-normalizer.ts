import { basename } from 'node:path'
import type { TaskItem } from '../common.types'
import { generateTaskId } from './id-generator'

const VALID_STATUSES = new Set<TaskItem['status']>([
  'downloading',
  'downloaded',
  'failed',
  'paused',
  'success',
  'waiting',
  'unfinished',
])

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function getTaskNameFromUrl(url?: string): string | undefined {
  if (!isNonEmptyString(url))
    return undefined

  try {
    const pathname = new URL(url).pathname
    const filename = pathname.split('/').pop()
    if (!isNonEmptyString(filename))
      return undefined
    return decodeURIComponent(filename)
  }
  catch {
    return undefined
  }
}

function getTaskNameFromDirectory(directory?: string): string | undefined {
  if (!isNonEmptyString(directory))
    return undefined

  const folderName = basename(directory)
  return isNonEmptyString(folderName) ? folderName : undefined
}

function getNormalizedStatus(task: Partial<TaskItem>): TaskItem['status'] {
  if (task.segmentCount && task.downloadedCount === task.segmentCount)
    return 'downloaded'

  if (VALID_STATUSES.has(task.status as TaskItem['status']))
    return task.status as TaskItem['status']

  return 'unfinished'
}

function getCreatedAt(task: Partial<TaskItem>): number {
  const createdAt = Number(task.createdAt || task.createTime)
  return Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now()
}

function getDisplayName(task: Partial<TaskItem>, taskId: string): string {
  return task.name?.trim()
    || task.title?.trim()
    || getTaskNameFromUrl(task.url)
    || getTaskNameFromDirectory(task.directory)
    || `未命名任务-${taskId.slice(0, 8)}`
}

function getUniqueTaskId(task: Partial<TaskItem>, usedTaskIds: Set<string>): string {
  const preferredId = isNonEmptyString(task.taskId)
    ? task.taskId.trim()
    : isNonEmptyString(String(task.createTime || ''))
        ? String(task.createTime)
        : isNonEmptyString(String(task.createdAt || ''))
            ? String(task.createdAt)
            : generateTaskId()

  let nextTaskId = preferredId
  while (usedTaskIds.has(nextTaskId))
    nextTaskId = generateTaskId()

  usedTaskIds.add(nextTaskId)
  return nextTaskId
}

function scoreTask(task: TaskItem): number {
  return [task.url, task.directory, task.progress, task.name, task.title]
    .filter(isNonEmptyString)
    .length
}

export function normalizePersistedTask(task: Partial<TaskItem>, usedTaskIds = new Set<string>()): TaskItem {
  const taskId = getUniqueTaskId(task, usedTaskIds)
  const createdAt = getCreatedAt(task)
  const segmentCount = Number(task.segmentCount || 0) || undefined
  const downloadedCount = Number(task.downloadedCount || 0) || undefined

  return {
    url: isNonEmptyString(task.url) ? task.url.trim() : '',
    headers: task.headers && typeof task.headers === 'object' ? task.headers : {},
    type: task.type,
    status: getNormalizedStatus({ ...task, segmentCount, downloadedCount }),
    duration: typeof task.duration === 'number' ? task.duration : undefined,
    durationStr: isNonEmptyString(task.durationStr) ? task.durationStr : undefined,
    name: getDisplayName(task, taskId),
    from: isNonEmptyString(task.from) ? task.from.trim() : undefined,
    taskId,
    createdAt,
    title: isNonEmptyString(task.title) ? task.title.trim() : undefined,
    directory: isNonEmptyString(task.directory) ? task.directory.trim() : undefined,
    segmentCount,
    downloadedCount,
    progress: isNonEmptyString(task.progress) ? task.progress : undefined,
    retryCount: typeof task.retryCount === 'number' ? task.retryCount : undefined,
    og: task.og,
    tags: Array.isArray(task.tags) ? Array.from(new Set(task.tags.map(tag => tag.trim()).filter(Boolean))) : undefined,
    folderConflict: task.folderConflict,
    createTime: undefined,
  }
}

export function repairPersistedTasks(tasks: Partial<TaskItem>[]): { tasks: TaskItem[], changed: boolean } {
  const usedTaskIds = new Set<string>()
  const normalizedTasks = tasks.map(task => ({
    originalIdentity: isNonEmptyString(task.taskId)
      ? task.taskId.trim()
      : isNonEmptyString(task.url) && isNonEmptyString(task.directory)
          ? `${task.url.trim()}::${task.directory.trim()}`
          : '',
    task: normalizePersistedTask(task, usedTaskIds),
  }))
  const dedupedTasks: TaskItem[] = []
  const taskIndexByIdentity = new Map<string, number>()

  for (const item of normalizedTasks) {
    const task = item.task
    const identity = item.originalIdentity || task.taskId || `${task.url}::${task.directory}`
    const existingIndex = taskIndexByIdentity.get(identity)

    if (existingIndex === undefined) {
      taskIndexByIdentity.set(identity, dedupedTasks.length)
      dedupedTasks.push(task)
      continue
    }

    if (scoreTask(task) > scoreTask(dedupedTasks[existingIndex]))
      dedupedTasks[existingIndex] = task
  }

  const changed = JSON.stringify(tasks) !== JSON.stringify(dedupedTasks)
  return { tasks: dedupedTasks, changed }
}