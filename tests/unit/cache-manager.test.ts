import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CacheManager } from '../../src/main/core/cache-manager'

describe('CacheManager', () => {
  let cacheManager: CacheManager

  beforeEach(() => {
    cacheManager = CacheManager.getInstance()
    cacheManager.clear()
  })

  describe('basic cache operations', () => {
    it('should set and get values', () => {
      const key = 'test_key'
      const value = { data: 'test_value' }

      cacheManager.set(key, value)
      const retrieved = cacheManager.get(key)

      expect(retrieved).toEqual(value)
    })

    it('should return undefined for non-existent keys', () => {
      const result = cacheManager.get('non_existent_key')

      expect(result).toBeUndefined()
    })

    it('should check if key exists', () => {
      const key = 'test_key'

      expect(cacheManager.has(key)).toBe(false)

      cacheManager.set(key, { data: 'test' })

      expect(cacheManager.has(key)).toBe(true)
    })

    it('should delete keys', () => {
      const key = 'test_key'

      cacheManager.set(key, { data: 'test' })
      expect(cacheManager.has(key)).toBe(true)

      cacheManager.delete(key)
      expect(cacheManager.has(key)).toBe(false)
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should expire items after TTL', () => {
      const key = 'expiring_key'
      cacheManager.set(key, { data: 'test' }, { ttl: 100 })

      // Should be available immediately
      expect(cacheManager.has(key)).toBe(true)

      // Should be available after 50ms
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cacheManager.has(key)).toBe(true)
          resolve()
        }, 50)
      })
    })

    it('should not expire items before TTL', () => {
      const key = 'expiring_key'
      const ttl = 2000 // 2 seconds
      cacheManager.set(key, { data: 'test' }, { ttl })

      // Should be available after 1 second
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cacheManager.has(key)).toBe(true)
          resolve()
        }, 1000)
      })
    })
  })

  describe('LRU (Least Recently Used) eviction', () => {
    it('should evict least recently used items when cache is full', () => {
      const maxSize = 3
      cacheManager = CacheManager.getInstance({ maxSize })

      cacheManager.set('key1', { data: 'value1' })
      cacheManager.set('key2', { data: 'value2' })
      cacheManager.set('key3', { data: 'value3' })

      // All three should be available
      expect(cacheManager.has('key1')).toBe(true)
      expect(cacheManager.has('key2')).toBe(true)
      expect(cacheManager.has('key3')).toBe(true)

      // Add one more item, should evict key1 (least recently used)
      cacheManager.set('key4', { data: 'value4' })

      expect(cacheManager.has('key1')).toBe(false)
      expect(cacheManager.has('key2')).toBe(true)
      expect(cacheManager.has('key3')).toBe(true)
      expect(cacheManager.has('key4')).toBe(true)
    })

    it('should update access time on get', () => {
      const maxSize = 3
      cacheManager = CacheManager.getInstance({ maxSize })

      cacheManager.set('key1', { data: 'value1' })
      cacheManager.set('key2', { data: 'value2' })
      cacheManager.set('key3', { data: 'value3' })

      // Access key1 to make it most recently used
      cacheManager.get('key1')

      // Add one more item, should evict key2 (now least recently used)
      cacheManager.set('key4', { data: 'value4' })

      expect(cacheManager.has('key1')).toBe(true)
      expect(cacheManager.has('key2')).toBe(false)
      expect(cacheManager.has('key3')).toBe(true)
      expect(cacheManager.has('key4')).toBe(true)
    })
  })

  describe('cache statistics', () => {
    it('should provide cache statistics', () => {
      cacheManager.set('key1', { data: 'value1' })
      cacheManager.set('key2', { data: 'value2' })

      const stats = cacheManager.getStats()

      expect(stats.size).toBe(2)
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
    })

    it('should track hits and misses', () => {
      cacheManager.set('key1', { data: 'value1' })

      cacheManager.get('key1') // Hit
      cacheManager.get('key2') // Miss
      cacheManager.get('key1') // Hit
      cacheManager.get('key3') // Miss

      const stats = cacheManager.getStats()

      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(2)
      expect(stats.hitRate).toBeCloseTo(0.5)
    })
  })

  describe('cache operations', () => {
    it('should clear all items', () => {
      cacheManager.set('key1', { data: 'value1' })
      cacheManager.set('key2', { data: 'value2' })

      expect(cacheManager.getStats().size).toBe(2)

      cacheManager.clear()

      expect(cacheManager.getStats().size).toBe(0)
    })

    it('should get multiple keys', () => {
      cacheManager.set('key1', { data: 'value1' })
      cacheManager.set('key2', { data: 'value2' })
      cacheManager.set('key3', { data: 'value3' })

      const results = cacheManager.getMany(['key1', 'key2', 'key3'])

      expect(results.key1).toEqual({ data: 'value1' })
      expect(results.key2).toEqual({ data: 'value2' })
      expect(results.key3).toEqual({ data: 'value3' })
    })

    it('should set multiple keys', () => {
      const items = {
        key1: { data: 'value1' },
        key2: { data: 'value2' },
        key3: { data: 'value3' },
      }

      cacheManager.setMany(items)

      expect(cacheManager.has('key1')).toBe(true)
      expect(cacheManager.has('key2')).toBe(true)
      expect(cacheManager.has('key3')).toBe(true)
    })
  })

  describe('prefix-based operations', () => {
    it('should delete keys by prefix', () => {
      cacheManager.set('user:1', { data: 'user1' })
      cacheManager.set('user:2', { data: 'user2' })
      cacheManager.set('post:1', { data: 'post1' })

      cacheManager.deleteByPrefix('user:')

      expect(cacheManager.has('user:1')).toBe(false)
      expect(cacheManager.has('user:2')).toBe(false)
      expect(cacheManager.has('post:1')).toBe(true)
    })

    it('should get keys by prefix', () => {
      cacheManager.set('user:1', { data: 'user1' })
      cacheManager.set('user:2', { data: 'user2' })
      cacheManager.set('post:1', { data: 'post1' })

      const keys = cacheManager.getKeysByPrefix('user:')

      expect(keys).toContain('user:1')
      expect(keys).toContain('user:2')
      expect(keys).not.toContain('post:1')
    })
  })

  describe('performance', () => {
    it('should handle large number of items efficiently', () => {
      const itemCount = 1000

      for (let i = 0; i < itemCount; i++) {
        cacheManager.set(`key${i}`, { data: `value${i}` })
      }

      const stats = cacheManager.getStats()
      expect(stats.size).toBe(itemCount)

      // Random access test
      for (let i = 0; i < 100; i++) {
        const randomKey = `key${Math.floor(Math.random() * itemCount)}`
        expect(cacheManager.has(randomKey)).toBe(true)
      }
    })
  })

  describe('error handling', () => {
    it('should handle invalid keys gracefully', () => {
      expect(() => {
        cacheManager.set('', { data: 'test' })
      }).not.toThrow()
    })

    it('should handle null/undefined values', () => {
      const key = 'null_key'
      cacheManager.set(key, null)

      expect(cacheManager.get(key)).toBeNull()
    })
  })
})
