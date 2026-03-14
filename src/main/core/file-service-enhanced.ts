import { dirname, join } from 'node:path'
import fs from 'node:fs'
import fsExtra from 'fs-extra'
import { ErrorCode, FileSystemError } from '../../shared/types'
import { errorHandler } from './error-handler'
import { LogLevel, logger } from './logger'

/**
 * Enhanced File Service with error handling and logging
 */
export class EnhancedFileService {
  constructor() {
    logger.logInfo('[EnhancedFileService] Service initialized')
  }

  /**
   * Check if file exists
   */
  exists(path: string): boolean {
    try {
      return fs.existsSync(path)
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        throwError: false,
        context: { path, operation: 'exists' },
      })
      return false
    }
  }

  /**
   * Check if directory exists
   */
  directoryExists(path: string): boolean {
    try {
      return this.exists(path) && fs.statSync(path).isDirectory()
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        throwError: false,
        context: { path, operation: 'directoryExists' },
      })
      return false
    }
  }

  /**
   * Create directory recursively
   */
  async createDirectory(path: string, options?: { recursive?: boolean }): Promise<void> {
    try {
      await fsExtra.ensureDir(path)
      logger.logInfo('[EnhancedFileService] Directory created', { path })
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        notifyUser: true,
        throwError: true,
        context: { path, operation: 'createDirectory' },
      })
    }
  }

  /**
   * Read file content
   */
  async readFile(path: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    try {
      const content = fs.readFileSync(path, encoding)
      logger.logDebug('[EnhancedFileService] File read', { path, size: content.length })
      return content
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        notifyUser: true,
        throwError: true,
        context: { path, operation: 'readFile' },
      })
    }
  }

  /**
   * Write file content
   */
  async writeFile(path: string, content: string | Buffer): Promise<void> {
    try {
      // Ensure parent directory exists
      const dir = dirname(path)
      if (!this.directoryExists(dir)) {
        await this.createDirectory(dir)
      }

      fs.writeFileSync(path, content)
      logger.logDebug('[EnhancedFileService] File written', { path, size: Buffer.byteLength(content) })
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        notifyUser: true,
        throwError: true,
        context: { path, operation: 'writeFile' },
      })
    }
  }

  /**
   * Delete file
   */
  async deleteFile(path: string): Promise<void> {
    try {
      if (this.exists(path)) {
        fs.unlinkSync(path)
        logger.logInfo('[EnhancedFileService] File deleted', { path })
      }
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        notifyUser: true,
        throwError: true,
        context: { path, operation: 'deleteFile' },
      })
    }
  }

  /**
   * Delete directory recursively
   */
  async deleteDirectory(path: string): Promise<void> {
    try {
      if (this.directoryExists(path)) {
        await fsExtra.remove(path)
        logger.logInfo('[EnhancedFileService] Directory deleted', { path })
      }
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        notifyUser: true,
        throwError: true,
        context: { path, operation: 'deleteDirectory' },
      })
    }
  }

  /**
   * List files in directory
   */
  listFiles(path: string): string[] {
    try {
      if (!this.directoryExists(path)) {
        return []
      }
      const files = fs.readdirSync(path)
      logger.logDebug('[EnhancedFileService] Directory listed', { path, fileCount: files.length })
      return files
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        throwError: false,
        context: { path, operation: 'listFiles' },
      })
      return []
    }
  }

  /**
   * Copy file
   */
  async copyFile(source: string, destination: string): Promise<void> {
    try {
      await fsExtra.copy(source, destination)
      logger.logInfo('[EnhancedFileService] File copied', { source, destination })
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        notifyUser: true,
        throwError: true,
        context: { source, destination, operation: 'copyFile' },
      })
    }
  }

  /**
   * Move file
   */
  async moveFile(source: string, destination: string): Promise<void> {
    try {
      await fsExtra.move(source, destination)
      logger.logInfo('[EnhancedFileService] File moved', { source, destination })
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        notifyUser: true,
        throwError: true,
        context: { source, destination, operation: 'moveFile' },
      })
    }
  }

  /**
   * Download file from URL
   */
  async downloadFile(url: string, targetPath: string, headers?: Record<string, string>): Promise<void> {
    try {
      logger.logInfo('[EnhancedFileService] Starting file download', { url, targetPath })

      const response = await fetch(url, {
        headers: headers as Record<string, string>,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const buffer = await response.arrayBuffer()
      await this.writeFile(targetPath, Buffer.from(buffer))

      logger.logInfo('[EnhancedFileService] File downloaded successfully', {
        url,
        targetPath,
        size: buffer.byteLength,
      })
    }
    catch (error) {
      // Enhance error with download context
      const enhancedError = error instanceof Error ? error : new Error(String(error))
      enhancedError.message = `Failed to download file from ${url}: ${enhancedError.message}`

      errorHandler.handle(enhancedError, {
        logError: true,
        notifyUser: true,
        throwError: true,
        context: { url, targetPath, headers, operation: 'downloadFile' },
      })
    }
  }

  /**
   * Get file size
   */
  getFileSize(path: string): number {
    try {
      const stats = fs.statSync(path)
      logger.logDebug('[EnhancedFileService] File size retrieved', { path, size: stats.size })
      return stats.size
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        throwError: false,
        context: { path, operation: 'getFileSize' },
      })
      return 0
    }
  }

  /**
   * Get directory size recursively
   */
  getDirectorySize(path: string): number {
    try {
      if (!this.directoryExists(path)) {
        return 0
      }

      let totalSize = 0
      const files = this.listFiles(path)

      for (const file of files) {
        const filePath = join(path, file)
        const stats = fs.statSync(filePath)

        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(filePath)
        }
        else {
          totalSize += stats.size
        }
      }

      logger.logDebug('[EnhancedFileService] Directory size calculated', {
        path,
        totalSize,
        fileCount: files.length,
      })

      return totalSize
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        throwError: false,
        context: { path, operation: 'getDirectorySize' },
      })
      return 0
    }
  }

  /**
   * Format file size to human readable format
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  /**
   * Clean up directory (remove old files)
   */
  async cleanupDirectory(path: string, maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      if (!this.directoryExists(path)) {
        return
      }

      const files = this.listFiles(path)
      const now = Date.now()
      let cleanedCount = 0

      for (const file of files) {
        const filePath = join(path, file)
        const stats = fs.statSync(filePath)

        if (stats.mtimeMs < now - maxAge) {
          await this.deleteFile(filePath)
          cleanedCount++
        }
      }

      logger.logInfo('[EnhancedFileService] Directory cleanup completed', {
        path,
        maxAge: `${maxAge / (24 * 60 * 60 * 1000)} days`,
        cleanedCount,
      })
    }
    catch (error) {
      errorHandler.handle(error as Error, {
        logError: true,
        throwError: false,
        context: { path, maxAge, operation: 'cleanupDirectory' },
      })
    }
  }
}

// Export singleton instance
export const enhancedFileService = new EnhancedFileService()
