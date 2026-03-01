import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  // @dreamwallet/db must be external — Prisma 7 uses WASM and cannot be bundled
  noExternal: [/@dreamwallet\/shared/, /@dreamwallet\/bank-integrations/],
  platform: 'node',
  clean: true,
})
