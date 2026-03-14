import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FileService } from '../../src/main/core/file.service'

describe('fileService', () => {
  let fileService: FileService
  let testDir: string

  beforeEach(() => {
    fileService = new FileService()
    testDir = join(tmpdir(), `test-${Date.now()}`)
  })

  afterEach(async () => {
    // Cleanup test directory
    try {
      const fsExtra = await import('fs-extra')
      await fsExtra.remove(testDir)
    }
    catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('file operations', () => {
    it('should write and read file', async () => {
      const testContent = 'Hello, World!'
      const testFile = join(testDir, 'test.txt')

      await fileService.writeFile(testFile, testContent)
      const readContent = await fileService.readFile(testFile)

      expect(readContent).toBe(testContent)
    })

    it('should check if file exists', () => {
      const testFile = join(testDir, 'test.txt')

      expect(fileService.exists(testFile)).toBe(false)

      fileService.writeFile(testFile, 'test')

      expect(fileService.exists(testFile)).toBe(true)
    })

    it('should delete file', async () => {
      const testFile = join(testDir, 'test.txt')

      await fileService.writeFile(testFile, 'test')
      expect(fileService.exists(testFile)).toBe(true)

      await fileService.deleteFile(testFile)
      expect(fileService.exists(testFile)).toBe(false)
    })
  })

  describe('directory operations', () => {
    it('should create directory', async () => {
      const testSubDir = join(testDir, 'subdir')

      await fileService.createDirectory(testSubDir)
      expect(fileService.directoryExists(testSubDir)).toBe(true)
    })

    it('should list files in directory', async () => {
      await fileService.createDirectory(testDir)

      await fileService.writeFile(join(testDir, 'file1.txt'), 'content1')
      await fileService.writeFile(join(testDir, 'file2.txt'), 'content2')

      const files = fileService.listFiles(testDir)

      expect(files).toContain('file1.txt')
      expect(files).toContain('file2.txt')
    })

    it('should delete directory', async () => {
      const testSubDir = join(testDir, 'subdir')

      await fileService.createDirectory(testSubDir)
      expect(fileService.directoryExists(testSubDir)).toBe(true)

      await fileService.deleteDirectory(testSubDir)
      expect(fileService.directoryExists(testSubDir)).toBe(false)
    })
  })

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(fileService.formatFileSize(1024)).toBe('1.00 KB')
      expect(fileService.formatFileSize(1024 * 1024)).toBe('1.00 MB')
      expect(fileService.formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB')
      expect(fileService.formatFileSize(500)).toBe('500.00 B')
    })
  })

  describe('getFileSize', () => {
    it('should get file size', async () => {
      const testContent = 'Hello, World!'
      const testFile = join(testDir, 'test.txt')

      await fileService.writeFile(testFile, testContent)
      const size = fileService.getFileSize(testFile)

      expect(size).toBe(testContent.length)
    })

    it('should return 0 for non-existent file', () => {
      const testFile = join(testDir, 'nonexistent.txt')
      const size = fileService.getFileSize(testFile)

      expect(size).toBe(0)
    })
  })
})
