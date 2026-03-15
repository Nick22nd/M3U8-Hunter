import Logger from 'electron-log'

/**
 * Cache item structure
 */
interface CacheItem<T> {
  key: string
  value: T
  timestamp: number
  ttl: number
  hits: number
  size: number
}

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  item: CacheItem<T>
  next: CacheEntry<T> | null
  previous: CacheEntry<T> | null
}

/**
 * Cache options
 */
interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of items
  maxMemory?: number // Maximum memory usage in bytes
}

/**
 * LRU Cache implementation
 */
export class CacheManager {
  private static instance: CacheManager
  private cache: Map<string, CacheEntry<any>> = new Map()
  private head: CacheEntry<any> | null = null
  private tail: CacheEntry<any> | null = null
  private size: number = 0
  private maxMemory: number = 50 * 1024 * 1024 // 50 MB default
  private maxSize: number = 1000
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutes default

  private constructor(options?: CacheOptions) {
    if (options) {
      if (options.maxSize)
        this.maxSize = options.maxSize
      if (options.maxMemory)
        this.maxMemory = options.maxMemory
      if (options.ttl)
        this.defaultTTL = options.ttl
    }

    this.setupPeriodicCleanup()
    Logger.info('[CacheManager] Cache initialized', {
      maxSize: this.maxSize,
      maxMemory: this.maxMemory,
      defaultTTL: this.defaultTTL,
    })
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: CacheOptions): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(options)
    }
    return CacheManager.instance
  }

  /**
   * Set cache value
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const item: CacheItem<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
      size: this.calculateSize(value),
    }

    // Check if key already exists
    if (this.cache.has(key)) {
      const existingEntry = this.cache.get(key)!
      // Update hits count for existing item
      existingEntry.item.hits++
      this.cache.set(key, {
        item: existingEntry.item,
        timestamp: item.timestamp,
      })
      Logger.debug(`[CacheManager] Cache hit for key: ${key} (hits: ${existingEntry.item.hits})`)
    }
    else {
      // New entry
      const entry: CacheEntry<T> = {
        item,
        next: null,
        previous: null,
      }

      this.cache.set(key, entry)
      this.addToHead(entry)
      this.size++
    }

    // Check memory limit
    if (this.size > this.maxSize || this.getCurrentMemoryUsage() > this.maxMemory) {
      this.evictOldest()
    }
  }

  /**
   * Get cache value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (entry) {
      // Check if expired
      if (this.isExpired(entry.item)) {
        Logger.debug(`[CacheManager] Cache expired for key: ${key}`)
        this.delete(key)
        return null
      }

      // Update LRU
      this.moveToHead(entry)
      entry.item.hits++
      Logger.debug(`[CacheManager] Cache get for key: ${key} (hits: ${entry.item.hits})`)
      return entry.item.value
    }
    return null
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    return entry !== undefined && !this.isExpired(entry.item)
  }

  /**
   * Delete cache entry
   */
  delete(key: string): void {
    const entry = this.cache.get(key)
    if (entry) {
      // Remove from linked list
      if (entry.previous) {
        entry.previous.next = entry.next
      }
      else if (this.head === entry) {
        this.head = entry.next
      }

      this.cache.delete(key)
      this.size--
      Logger.debug(`[CacheManager] Cache deleted for key: ${key}`)
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
    this.head = null
    this.tail = null
    this.size = 0
    Logger.info('[CacheManager] Cache cleared')
  }

  /**
   * Move entry to head (LRU)
   */
  private moveToHead<T>(entry: CacheEntry<T>): void {
    // Remove from current position
    if (entry.previous) {
      entry.previous.next = entry.next
    }
    else if (this.head === entry) {
      this.head = entry.next
    }
    else if (this.tail) {
      this.tail.next = entry
      this.head = entry
    }

    // Add to head
    entry.next = null
    entry.previous = this.head

    if (!this.head) {
      this.head = entry
    }

    if (this.tail === entry) {
      this.tail = entry
    }
  }

  /**
   * Add to head
   */
  private addToHead<T>(entry: CacheEntry<T>): void {
    if (!this.head) {
      this.head = entry
      entry.previous = null
      this.tail = entry
    }
    else {
      entry.previous = this.head
      this.head.next = entry
      this.head = entry
    }
  }

  /**
   * Remove from linked list (LRU)
   */
  private evictOldest(): void {
    if (!this.tail) {
      return
    }

    const tail = this.tail
    const oldestTime = tail.item.timestamp

    Logger.debug('[CacheManager] Evicting oldest entry', {
      key: tail.item.key,
      age: Date.now() - oldestTime,
    })

    this.delete(tail.item.key)
  }

  /**
   * Get cache statistics
   */
  getStatistics(): {
    size: number
    hitRate: number
    memoryUsage: string
    expiredCount: number
    averageSize: number
  } {
    const cacheData = Array.from(this.cache.values())
    const _now = Date.now()

    let totalHits = 0
    let expiredCount = 0
    let totalSize = 0

    for (const entry of cacheData) {
      if (this.isExpired(entry.item)) {
        expiredCount++
      }
      else {
        totalHits += entry.item.hits
        totalSize += entry.item.size
      }
    }

    const hitRate = this.size > 0 ? Math.round((totalHits / this.size) * 100) : 0
    const averageSize = this.size > 0 ? Math.round(totalSize / this.size) : 0

    return {
      size: this.size,
      hitRate: `${hitRate}%`,
      memoryUsage: this.formatSize(this.getCurrentMemoryUsage()),
      expiredCount,
      averageSize: this.formatSize(averageSize),
    }
  }

  /**
   * Check if cache item is expired
   */
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl
  }

  /**
   * Calculate size of cache item
   */
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length
    }
    catch {
      // Fallback to approximate size
      return 1024 // 1KB default
    }
  }

  /**
   * Get current memory usage of cache
   */
  private getCurrentMemoryUsage(): number {
    let totalSize = 0

    for (const [_key, entry] of this.cache) {
      totalSize += entry.item.size
    }

    return totalSize
  }

  /**
   * Format bytes to human readable format
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  /**
   * Setup periodic cleanup
   */
  private setupPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredItems()
      this.checkMemoryPressure()
    }, 60000) // Every minute

    Logger.info('[CacheManager] Periodic cleanup configured: 1 minute')
  }

  /**
   * Cleanup expired items
   */
  private cleanupExpiredItems(): void {
    const _now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry.item)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.delete(key)
    }

    if (keysToDelete.length > 0) {
      Logger.debug(`[CacheManager] Cleaned up ${keysToDelete.length} expired items`)
    }
  }

  /**
   * Check memory pressure and take action
   */
  private checkMemoryPressure(): void {
    if (this.getCurrentMemoryUsage() > this.maxMemory) {
      Logger.warn(`[CacheManager] High memory pressure detected, clearing cache`)
      this.evictOldest()
    }
  }

  /**
   * Get cached M3U8 content
   */
  getM3U8Content(url: string): string | null {
    const key = `m3u8:${url}`
    return this.get<string>(key)
  }

  /**
   * Cache M3U8 content
   */
  setM3U8Content(url: string, content: string): void {
    const key = `m3u8:${url}`
    this.set(key, content, 10 * 60 * 1000) // 10 minutes TTL
  }

  /**
   * Get parsed manifest
   */
  getParsedManifest(url: string): any | null {
    const key = `parsed:${url}`
    return this.get<any>(key)
  }

  /**
   * Cache parsed manifest
   */
  cacheParsedManifest(url: string, manifest: any): void {
    const key = `parsed:${url}`
    this.set(key, manifest, 30 * 60 * 1000) // 30 minutes TTL
  }

  /**
   * Get Aria2 config
   */
  getAria2Config(): any | null {
    return this.get('aria2:config')
  }

  /**
   * Cache Aria2 config
   */
  setAria2Config(config: any): void {
    this.set('aria2:config', config, 15 * 60 * 1000) // 15 minutes TTL
  }

  /**
   * Clear cache by prefix
   */
  clearByPrefix(prefix: string): void {
    const keysToDelete: string[] = []

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.delete(key)
    }

    Logger.info(`[CacheManager] Cleared cache by prefix: ${prefix} (${keysToDelete.length} items)`)
  }

  /**
   * Warm up cache with multiple items
   */
  async warmUp(items: Array<{ key: string, value: any, ttl?: number }>): Promise<void> {
    Logger.info(`[CacheManager] Warming up cache with ${items.length} items`)

    for (const item of items) {
      this.set(item.key, item.value, item.ttl)
      // Small delay to avoid overwhelming system
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance()
