// @ts-check
const lightwing = require('@lightwing/eslint-config').default

module.exports = lightwing(
  {
    ignores: [
      'dist',
      'node_modules',
      '*.svelte',
      '*.snap',
      '*.d.ts',
      'coverage',
      'js_test',
      'local-data',
    ],
    rules: {
      'no-console': 'off', // 允许使用 console
      'no-unused-vars': 'warn', // 允许声明未使用变量
      'unused-imports/no-unused-vars': 'warn',
    },
  },
)
