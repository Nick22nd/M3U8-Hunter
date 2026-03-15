/**
 * Test setup file
 */

// Set test environment
process.env.NODE_ENV = 'test'

// Mock console methods for cleaner test output
const originalLog = console.log
const originalError = console.error
const originalWarn = console.warn
const originalInfo = console.info

// Setup any test-specific configurations here
// Note: beforeAll, afterAll, afterEach are available globally due to vitest.config.ts settings
