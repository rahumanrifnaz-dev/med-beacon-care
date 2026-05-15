// @ts-ignore: dev dependency types may not be installed in this environment
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
})
