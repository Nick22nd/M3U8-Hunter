import { dirname, join } from 'node:path'
import fs from 'node:fs'
import fsExtra from 'fs-extra'
import Logger from 'electron-log'

/**
 * File service for file operations
 */
export class FileService {
  /**
   * Check if file exists
   */
  exists(path: string): boolean {
    return fs.existsSync(path)
  }

  /**
   * Check if directory exists
   */
  directoryExists(path: string): boolean {
    return this.exists(path) && fs.statSync(path).isDirectory()
  }

  /**
   * Create directory recursively
   */
  async createDirectory(path: string, options?: { recursive?: boolean }): Promise<void> {
    try {
      await fsExtra.ensureDir(path)
      Logger.info(`[FileService] Directory created: ${path}`)
    }
    catch (error) {
      Logger.error(`[FileService] Failed to create directory: ${path}`, error)
      throw new Error(`Failed to create directory: ${path}`)
    }
  }

  /**
   * Read file content
   */
  async readFile(path: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    try {
      const content = fs.readFileSync(path, encoding)
      return content
    }
    catch (error) {
      Logger.error(`[FileService] Failed to read file: ${path}`, error)
      throw new Error(`Failed to read file: ${path}`)
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
      Logger.debug(`[FileService] File written: ${path}`)
    }
    catch (error) {
      Logger.error(`[FileService] Failed to write file: ${path}`, error)
      throw new Error(`Failed to write file: ${path}`)
    }
  }

  /**
   * Delete file
   */
  async deleteFile(path: string): Promise<void> {
    try {
      if (this.exists(path)) {
        fs.unlinkSync(path)
        Logger.info(`[FileService] File deleted: ${path}`)
      }
    }
    catch (error) {
      Logger.error(`[FileService] Failed to delete file: ${path}`, error)
      throw new Error(`Failed to delete file: ${path}`)
    }
  }

  /**
   * Delete directory recursively
   */
  async deleteDirectory(path: string): Promise<void> {
    try {
      if (this.directoryExists(path)) {
        await fsExtra.remove(path)
        Logger.info(`[FileService] Directory deleted: ${path}`)
      }
    }
    catch (error) {
      Logger.error(`[FileService] Failed to delete directory: ${path}`, error)
      throw new Error(`Failed to delete directory: ${path}`)
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
      return fs.readdirSync(path)
    }
    catch (error) {
      Logger.error(`[FileService] Failed to list files: ${path}`, error)
      return []
    }
  }

  /**
   * Copy file
   */
  async copyFile(source: string, destination: string): Promise<void> {
    try {
      await fsExtra.copy(source, destination)
      Logger.info(`[FileService] File copied: ${source} -> ${destination}`)
    }
    catch (error) {
      Logger.error(`[FileService] Failed to copy file: ${source} -> ${destination}`, error)
      throw new Error(`Failed to copy file`)
    }
  }

  /**
   * Move file
   */
  async moveFile(source: string, destination: string): Promise<void> {
    try {
      await fsExtra.move(source, destination)
      Logger.info(`[FileService] File moved: ${source} -> ${destination}`)
    }
    catch (error) {
      Logger.error(`[FileService] Failed to move file: ${source} -> ${destination}`, error)
      throw new Error(`Failed to move file`)
    }
  }

  /**
   * Download file from URL
   */
  async downloadFile(url: string, targetPath: string, headers?: Record<string, string>): Promise<void> {
    try {
      const response = await fetch(url, {
        headers: headers as Record<string, string>,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const buffer = await response.arrayBuffer()
      await this.writeFile(targetPath, Buffer.from(buffer))
      Logger.info(`[FileService] File downloaded: ${url} -> ${targetPath}`)
    }
    catch (error) {
      Logger.error(`[FileService] Failed to download file: ${url}`, error)
      throw new Error(`Failed to download file: ${url}`)
    }
  }

  /**
   * Get file size
   */
  getFileSize(path: string): number {
    try {
      const stats = fs.statSync(path)
      return stats.size
    }
    catch (error) {
      Logger.error(`[FileService] Failed to get file size: ${path}`, error)
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

      return totalSize
    }
    catch (error) {
      Logger.error(`[FileService] Failed to get directory size: ${path}`, error)
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

      for (const file of files) {
        const filePath = join(path, file)
        const stats = fs.statSync(filePath)

        if (stats.mtimeMs < now - maxAge) {
          await this.deleteFile(filePath)
          Logger.info(`[FileService] Cleaned up old file: ${filePath}`)
        }
      }
    }
    catch (error) {
      Logger.error(`[FileService] Failed to cleanup directory: ${path}`, error)
    }
  }
}

// Export singleton instance
export const fileService = new FileService()
