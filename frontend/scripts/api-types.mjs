import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = fileURLToPath(new URL('..', import.meta.url))
const backend = fileURLToPath(new URL('../../backend', import.meta.url))
const temporary = mkdtempSync(join(tmpdir(), 'discrete-modules-openapi-'))

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} failed`)
  }
  return result.stdout
}

try {
  const schema = run(
    'uv',
    [
      'run',
      '--locked',
      'python',
      '-c',
      'import json; from src.main import create_app; print(json.dumps(create_app().openapi()))',
    ],
    backend,
  )
  const input = join(temporary, 'openapi.json')
  writeFileSync(input, schema)
  const args = [
    join(frontend, 'node_modules/openapi-typescript/bin/cli.js'),
    input,
    '--output',
    join(frontend, 'src/api/schema.d.ts'),
  ]
  if (process.argv.includes('--check')) args.push('--check')
  process.stdout.write(run(process.execPath, args, frontend))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
