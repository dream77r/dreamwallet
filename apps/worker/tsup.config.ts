import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  noExternal: [/@dreamwallet\/.*/],
  platform: 'node',
  clean: true,
})
