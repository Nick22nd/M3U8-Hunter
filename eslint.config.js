import antfu from '@antfu/eslint-config'

export default antfu({
  // Without `files`, they are general rules for all files
  rules: {
    'no-console': 'off',
    'node/prefer-global/process': 'off',
  },
}, {
  // Electron main process rules
  files: ['src/main/**/*.{ts,js}'],
  rules: {
    'node/no-unpublished-import': 'off',
    'node/no-missing-import': 'off',
    'node/prefer-global/buffer': 'off',
    'node/prefer-global/console': 'off',
    'node/prefer-global/url': 'off',
    'n/prefer-global/process': 'off',
    'n/no-process-exit': 'off',
    // Electron specific rules
    'no-undef': 'error',
  },
}, {
  // Preload scripts
  files: ['src/preload/**/*.{ts,js}'],
  rules: {
    'node/prefer-global/buffer': 'off',
    'node/prefer-global/console': 'off',
  },
}, {
  // Vue renderer process
  files: ['src/renderer/**/*.{vue,ts,js}'],
  rules: {
    'vue/multi-word-component-names': 'off',
  },
}, {
  // TypeScript files
  files: ['**/*.ts', '**/*.tsx'],
  rules: {
    'ts/consistent-type-imports': ['warn', { prefer: 'type-imports', disallowTypeAnnotations: false }],
    'ts/no-explicit-any': 'warn',
  },
})
