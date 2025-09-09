import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 20000,
    include: [
      'tests/unit/**/*.spec.ts'
    ],
    exclude: [
      '**/node_modules/**',
      'tests-examples/**',
      'app/api/email/__tests__/**',
      'tests/integration/**',
      'tests/example.spec.ts'
    ]
  }
  , resolve: {
    alias: {
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/store': path.resolve(__dirname, './store'),
      '@/app': path.resolve(__dirname, './app')
    }
  }
})
