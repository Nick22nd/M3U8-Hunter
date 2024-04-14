import { expect, test } from 'vitest'
import { sum } from './sum'
import { getAppDataDir } from '../electron/lib/utils'
import path from 'path'
import os from 'os'

test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3)
})

test('app directory path', () => {
    expect(getAppDataDir()).toBe(path.join(os.homedir(), 'M3U8Hunter'))
})