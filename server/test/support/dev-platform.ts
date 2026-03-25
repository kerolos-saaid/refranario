import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { D1Database } from '@cloudflare/workers-types'
import { getPlatformProxy } from 'wrangler'

import type { AppBindings } from '../../src/shared/types/app-env'

const WRANGLER_CONFIG_PATH = fileURLToPath(new URL('../../../wrangler.toml', import.meta.url))
const SCHEMA_PATH = fileURLToPath(new URL('../../src/schema.sql', import.meta.url))
const SEED_PATH = fileURLToPath(new URL('../../src/seed.sql', import.meta.url))
const TEST_STATE_ROOT = fileURLToPath(new URL('../../../.wrangler/test-platforms/', import.meta.url))

type DevPlatform = Awaited<ReturnType<typeof getPlatformProxy<AppBindings>>>

export type IsolatedDevPlatform = {
  statePath: string
  platform: DevPlatform
}

export async function createIsolatedDevPlatform(name: string): Promise<IsolatedDevPlatform> {
  await mkdir(TEST_STATE_ROOT, { recursive: true })
  const statePath = await mkdtemp(path.join(TEST_STATE_ROOT, `${name}-`))
  const platform = await getPlatformProxy<AppBindings>({
    configPath: WRANGLER_CONFIG_PATH,
    envFiles: [],
    persist: { path: statePath },
    remoteBindings: false
  })

  await resetDevDatabase(platform.env.senor_shabi_db)

  return { statePath, platform }
}

export async function resetIsolatedDevPlatform(instance: IsolatedDevPlatform): Promise<void> {
  await resetDevDatabase(instance.platform.env.senor_shabi_db)
}

export async function disposeIsolatedDevPlatform(instance: IsolatedDevPlatform): Promise<void> {
  await instance.platform.dispose()
  await rm(instance.statePath, { force: true, recursive: true })
}

async function resetDevDatabase(database: D1Database): Promise<void> {
  const schema = normalizeSql(await readFile(SCHEMA_PATH, 'utf8'))
  const seed = normalizeSql(await readFile(SEED_PATH, 'utf8'))

  await executeStatements(database, [
    'DROP TABLE IF EXISTS proverbs',
    'DROP TABLE IF EXISTS users',
    ...splitSqlStatements(schema),
    ...splitSqlStatements(seed)
  ])
}

async function executeStatements(database: D1Database, statements: string[]): Promise<void> {
  for (const statement of statements) {
    const trimmed = statement.trim()

    if (!trimmed) {
      continue
    }

    await database.prepare(trimmed).run()
  }
}

function normalizeSql(sql: string) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
}

function splitSqlStatements(sql: string) {
  const statements: string[] = []
  let current = ''
  let inString = false

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]
    const nextChar = sql[index + 1]

    current += char

    if (char === "'") {
      if (inString && nextChar === "'") {
        current += nextChar
        index += 1
        continue
      }

      inString = !inString
      continue
    }

    if (char === ';' && !inString) {
      statements.push(current.slice(0, -1))
      current = ''
    }
  }

  if (current.trim()) {
    statements.push(current)
  }

  return statements
}
