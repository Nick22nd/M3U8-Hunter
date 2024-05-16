import path from 'node:path'
import os from 'node:os'
import { expect } from 'vitest'
import { getAppDataDir } from '../electron/lib/utils'
import { sum } from './sum'

it('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})

it('app directory path', () => {
  expect(getAppDataDir()).toBe(path.join(os.homedir(), 'M3U8Hunter'))
})
