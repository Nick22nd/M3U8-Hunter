import * as crypto from 'node:crypto'

export function generateTaskId(): string {
  return crypto.randomUUID()
}
