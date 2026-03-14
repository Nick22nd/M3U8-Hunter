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
beforeAll(() => {
  console.log('Starting test suite...')
})

afterAll(() => {
  console.log('Test suite completed')
})

// Restore console methods after each test
afterEach(() => {
  // Keep original console methods for debugging
})
