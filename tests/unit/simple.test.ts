import { describe, expect, it } from 'vitest'

describe('Simple test', () => {
  it('should add numbers correctly', () => {
    const result = 2 + 2
    expect(result).toBe(4)
  })

  it('should check if array contains item', () => {
    const array = [1, 2, 3, 4, 5]
    expect(array).toContain(3)
  })
})
