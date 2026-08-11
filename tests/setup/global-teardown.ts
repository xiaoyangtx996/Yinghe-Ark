import { execSync } from 'node:child_process'
import { loadTestEnv } from './env'

function dockerAvailable() {
  try {
    execSync('docker --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export async function runGlobalTeardown() {
  loadTestEnv()

  const shouldBootstrap = process.env.BILLING_TEST_BOOTSTRAP === '1' || process.env.SYSTEM_TEST_BOOTSTRAP === '1'
  if (!shouldBootstrap) return
  if (process.env.BILLING_TEST_KEEP_SERVICES === '1') return
  if (!dockerAvailable()) return

  execSync('docker compose -f docker-compose.test.yml down -v --remove-orphans', {
    cwd: process.cwd(),
    stdio: 'inherit',
  })
}
