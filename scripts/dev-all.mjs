import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createInterface } from 'node:readline'
import { setTimeout as delay } from 'node:timers/promises'
import { parseEnv, promisify } from 'node:util'

const run = promisify(execFile)
const require = createRequire(import.meta.url)
const appUrl = 'http://localhost:3000'
const controller = new AbortController()
const children = new Set()
const commandOptions = { signal: controller.signal, timeout: 15 * 60_000, maxBuffer: 4 * 1024 * 1024 }

function stop() {
  controller.abort()
  for (const child of children) child.kill()
}

process.once('SIGINT', () => { process.exitCode = 130; stop() })
process.once('SIGTERM', () => { process.exitCode = 143; stop() })

async function checkCommand(command, install) {
  try {
    await run(command, ['--version'], { ...commandOptions, timeout: 5_000 })
  } catch {
    throw new Error(`Install or repair ${command} first. ${install}`)
  }
}

async function dockerReady() {
  try {
    await run('docker', ['info', '--format', '{{.ServerVersion}}'], { ...commandOptions, timeout: 3_000 })
    return true
  } catch {
    return false
  }
}

async function startDocker() {
  if (await dockerReady()) return
  controller.signal.throwIfAborted()
  if (process.platform !== 'darwin') {
    throw new Error('Start Docker, then rerun npm run dev:all.')
  }
  console.log('Opening Docker Desktop…')
  try {
    await run('open', ['-a', 'Docker'], commandOptions)
  } catch {
    throw new Error('Open Docker Desktop, then rerun npm run dev:all.')
  }
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    await delay(2_000, undefined, { signal: controller.signal })
    if (await dockerReady()) return
  }
  throw new Error('Docker did not become ready. Check Docker Desktop and run docker info.')
}

async function localSupabase() {
  async function status() {
    const { stdout } = await run('supabase', ['status', '-o', 'json'], commandOptions)
    const result = JSON.parse(stdout)
    return result.env ?? result
  }

  let config
  try {
    config = await status()
  } catch {
    controller.signal.throwIfAborted()
    console.log('Starting local Supabase… The first download may take several minutes.')
    try {
      await run('supabase', ['start'], commandOptions)
      config = await status()
    } catch {
      throw new Error('Local Supabase could not start. Run supabase start in this folder for details.')
    }
  }
  const url = URL.parse(config.API_URL)
  const publishableKey = config.PUBLISHABLE_KEY || config.ANON_KEY
  const secretKey = config.SECRET_KEY || config.SERVICE_ROLE_KEY
  if (!url || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !publishableKey || !secretKey) {
    throw new Error('Could not read the local API URL and keys. Check supabase status in this folder.')
  }
  return { SUPABASE_URL: url.origin, SUPABASE_PUBLISHABLE_KEY: publishableKey, SUPABASE_SECRET_KEY: secretKey }
}

function launch(command, args, options) {
  const child = spawn(command, args, options)
  children.add(child)
  child.once('close', () => children.delete(child))
  return { child, exited: once(child, 'exit') }
}

async function startStripe(key) {
  console.log('Connecting the Stripe test webhook listener…')
  const { child, exited } = launch('stripe', [
    'listen', '--events', 'checkout.session.completed,checkout.session.expired',
    '--forward-to', `${appUrl}/api/stripe/webhook`,
  ], { env: { ...process.env, STRIPE_API_KEY: key }, stdio: ['ignore', 'pipe', 'pipe'] })
  let timer
  const secret = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Timed out waiting for Stripe. Check the test key and connection.')), 30_000)
    for (const stream of [child.stdout, child.stderr]) {
      const lines = createInterface({ input: stream })
      lines.on('line', line => {
        const match = line.match(/\bwhsec_[a-zA-Z0-9_]+\b/)
        if (match) resolve(match[0])
      })
    }
  })

  try {
    const signingSecret = await Promise.race([secret, exited.then(() => {
      throw new Error('Stripe listener exited. Check that STRIPE_SECRET_KEY is valid for your Stripe sandbox.')
    })])
    return { signingSecret, exited }
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const contents = await readFile('.env.local', 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error
    return ''
  })
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? parseEnv(contents).STRIPE_SECRET_KEY
  if (!/^sk_test_[a-zA-Z0-9_]+$/.test(stripeKey ?? '')) {
    throw new Error('Set STRIPE_SECRET_KEY to your Stripe sandbox secret key (sk_test_…) in .env.local.')
  }

  const next = require.resolve('next/dist/bin/next')
  await Promise.all([
    checkCommand('docker', 'Install Docker Desktop.'),
    checkCommand('supabase', 'On macOS, run brew install supabase/tap/supabase.'),
    checkCommand('stripe', 'On macOS, run brew install stripe.'),
  ])
  await startDocker()
  const supabase = await localSupabase()
  const stripe = await startStripe(stripeKey)

  console.log(`Starting Next.js at ${appUrl}. Local email inbox: http://localhost:54324`)
  const app = launch(process.execPath, [next, 'dev', '--hostname', '127.0.0.1', '--port', '3000'], {
    stdio: 'inherit',
    env: {
      ...process.env, ...supabase, APP_URL: appUrl,
      STRIPE_SECRET_KEY: stripeKey, STRIPE_WEBHOOK_SECRET: stripe.signingSecret,
    },
  })
  await Promise.race([
    app.exited.then(([code]) => {
      if (!controller.signal.aborted && code !== 0) throw new Error('Next.js stopped. Check its output above.')
    }),
    stripe.exited.then(() => {
      if (!controller.signal.aborted) throw new Error('The Stripe listener stopped. Rerun npm run dev:all to reconnect.')
    }),
  ])
}

try {
  await main()
} catch (error) {
  if (!controller.signal.aborted) {
    console.error(error.code === 'MODULE_NOT_FOUND' ? 'Run npm install first.' : `dev:all: ${error.message}`)
    process.exitCode = 1
  }
} finally {
  stop()
}
