import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle/migrations',
  schema: './drizzle/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
})