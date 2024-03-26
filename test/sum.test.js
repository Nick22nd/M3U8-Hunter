import { expect, test } from 'vitest'
import { sum } from './sum'
import { getAppDataDir } from './src/s'
test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3)
})

test('app directory path', () => {
    expect(getAppDataDir())
})