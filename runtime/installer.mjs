#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

import { AGENT_FILES, SHARED_WORKFLOW_FILE } from './agents.mjs'

const VERSION = '3.0.0-next'
const MANIFEST = '.sdw/install.json'
const CANONICAL_AGENTS = AGENT_FILES
const TEMPLATES = ['scope.md', 'spec.md', 'plan.md', 'tasks.md', 'validation.md', 'retrospect.md', 'next.md', 'review.md', 'work.md']
const DOCS = ['integrations.md']
const TOOLS = new Set(['codex', 'opencode'])
const BEGIN = '<!-- BEGIN SPEC-DRIVEN-WORKFLOW MANAGED BLOCK -->'
const END = '<!-- END SPEC-DRIVEN-WORKFLOW MANAGED BLOCK -->'
const USAGE = 'Usage: installer.mjs install|update [--tools codex,opencode] [--dry-run] [--source-dir DIR]'

class InstallerError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const fail = (code, message) => { throw new InstallerError(code, message) }
const lstatOrNull = (target) => {
  try { return fs.lstatSync(target) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}
const sha256 = (content) => crypto.createHash('sha256').update(content).digest('hex')
const sourcePath = (root, relative) => path.join(root, relative)

const gitRoot = () => {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim() } catch { fail('NOT_GIT_REPOSITORY', 'target must be an ordinary Git repository') }
}

const gitRevision = (directory) => {
  try { return execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return null }
}

const isSourceRepository = (directory) => fs.existsSync(path.join(directory, 'maintainer', 'export', 'public-export.json')) && fs.existsSync(path.join(directory, 'agents'))

const parseArgs = (args) => {
  const values = { tools: null, dryRun: false, sourceDir: process.env.SPEC_DRIVEN_WORKFLOW_SOURCE_DIR ?? '', sourceUrl: process.env.SPEC_DRIVEN_WORKFLOW_REPO_URL ?? 'https://raw.githubusercontent.com/roperi/spec-driven-workflow/main' }
  const positional = []
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--dry-run') values.dryRun = true
    else if (arg === '--tools') {
      if (!args[index + 1]) fail('USAGE', '--tools requires a comma-separated tool list')
      values.tools = args[++index]
    } else if (arg === '--source-dir') {
      if (!args[index + 1]) fail('USAGE', '--source-dir requires a directory')
      values.sourceDir = args[++index]
    } else if (arg === '--source-url') {
      if (!args[index + 1]) fail('USAGE', '--source-url requires a URL')
      values.sourceUrl = args[++index]
    }
    else if (arg === '--help' || arg === '-h') values.help = true
    else if (arg.startsWith('--')) fail('USAGE', `unknown option: ${arg}`)
    else positional.push(arg)
  }
  if (values.help) return values
  if (!['install', 'update'].includes(positional[0])) fail('USAGE', USAGE)
  if (positional.length !== 1) fail('USAGE', USAGE)
  values.command = positional[0]
  return values
}

const selectedTools = (raw, manifest, command) => {
  const selected = raw ?? (command === 'update' ? manifest?.selected_tools?.join(',') : null)
  if (!selected) fail('TOOLS_REQUIRED', `${command} requires --tools codex,opencode${command === 'update' ? ' or an existing .sdw/install.json selection' : ''}`)
  const tools = [...new Set(selected.split(',').map((item) => item.trim()).filter(Boolean))]
  if (!tools.length || tools.some((tool) => !TOOLS.has(tool))) fail('TOOLS_INVALID', `supported tools are codex and opencode; received ${selected}`)
  return tools
}

const validateManifestPaths = (targetRoot, parsed) => {
  const managedPaths = [...Object.keys(parsed.files), ...Object.keys(parsed.blocks ?? {})]
  for (const relative of managedPaths) {
    if (typeof relative !== 'string' || relative === '') fail('MANIFEST_INVALID', `${MANIFEST}: managed path must be a non-empty string`)
    const segments = relative.split(/[\\/]/u)
    if (path.isAbsolute(relative) || segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
      fail('MANIFEST_INVALID', `${MANIFEST}: unsafe managed path '${relative}'; repair or remove the unrecognized manifest before retrying`)
    }
    if (segments.includes('.git')) fail('MANIFEST_INVALID', `${MANIFEST}: managed path '${relative}' targets Git metadata`)
    const target = path.join(targetRoot, relative)
    if (target !== path.join(targetRoot, ...segments) || !target.startsWith(`${targetRoot}${path.sep}`)) {
      fail('MANIFEST_INVALID', `${MANIFEST}: managed path '${relative}' escapes the target repository`)
    }
    let current = targetRoot
    for (const segment of segments) {
      current = path.join(current, segment)
      if (lstatOrNull(current)?.isSymbolicLink()) fail('MANIFEST_INVALID', `${MANIFEST}: managed path '${relative}' contains a symlink`)
    }
  }
}

const readManifest = (targetRoot) => {
  const filename = path.join(targetRoot, MANIFEST)
  if (!fs.existsSync(filename)) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'))
    if (!Array.isArray(parsed.selected_tools) || !parsed.files || typeof parsed.files !== 'object') fail('MANIFEST_INVALID', `${MANIFEST}: repair or remove this unrecognized installation manifest before retrying`)
    validateManifestPaths(targetRoot, parsed)
    return parsed
  } catch (error) {
    if (error instanceof InstallerError) throw error
    fail('MANIFEST_INVALID', `${MANIFEST}: cannot read installation ownership: ${error.message}`)
  }
}

const fetchText = async (base, relative) => {
  const response = await fetch(`${base.replace(/\/$/u, '')}/${relative}`)
  if (!response.ok) fail('SOURCE_UNAVAILABLE', `could not fetch ${relative}: HTTP ${response.status}`)
  return response.text()
}

const loadSource = async (values) => {
  if (values.sourceDir) {
    const root = path.resolve(values.sourceDir)
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) fail('SOURCE_UNAVAILABLE', `source directory does not exist: ${root}`)
    return { root, remote: false, identity: root }
  }
  return { root: null, remote: true, identity: values.sourceUrl }
}

const readSourceFile = async (source, relative) => source.remote ? fetchText(source.identity, relative) : fs.readFileSync(sourcePath(source.root, relative), 'utf8')

const loadRenderer = async (source, readFile) => {
  if (!source.remote) return import(pathToFileURL(sourcePath(source.root, 'runtime/render.mjs')).href)
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sdw-installer-render-'))
  fs.mkdirSync(path.join(temporary, 'runtime'))
  fs.mkdirSync(path.join(temporary, 'agents'))
  fs.writeFileSync(path.join(temporary, 'runtime/render.mjs'), await readFile('runtime/render.mjs'))
  fs.writeFileSync(path.join(temporary, 'runtime/agents.mjs'), await readFile('runtime/agents.mjs'))
  for (const agent of CANONICAL_AGENTS) fs.writeFileSync(path.join(temporary, 'agents', agent), await readFile(`agents/${agent}`))
  return { module: await import(pathToFileURL(path.join(temporary, 'runtime/render.mjs')).href), temporary, root: temporary }
}

const bootstrapBlock = () => `${BEGIN}
## Spec Driven Workflow

When the user explicitly asks for SDW, spec-driven, or session-based work, use
.sdw/agents/sdw.workflow.md as the primary entrypoint; use .sdw/agents/sdw.resume.md
to continue an existing work item. Do not activate SDW for unrelated requests.
The entrypoint owns creating .sdw/work/<work-id>/ and the initial artifacts; the
user does not need to run the helper first. Use node .sdw/sdw.mjs for start, saves,
checks, and read-only resume. Read the shared lifecycle instructions at
.sdw/agents/shared/workflow.md with the relevant canonical instruction.
Respect explicit stops and preserve user-owned files, model settings, and unrelated configuration.
${END}`

const replaceBlock = (current, block, expectedHash, relative, manifest) => {
  const start = current.indexOf(BEGIN)
  const finish = current.indexOf(END)
  if ((start >= 0) !== (finish >= 0) || finish < start) fail('BLOCK_CONFLICT', `${relative}: managed block markers are incomplete; repair the file manually`)
  if (start < 0) return current ? `${current.replace(/\s*$/u, '')}\n\n${block}\n` : `${block}\n`
  const oldBlock = current.slice(start, finish + END.length)
  if (!expectedHash || sha256(oldBlock) !== expectedHash) fail('BLOCK_CONFLICT', `${relative}: existing managed block is locally modified or unrecognized; preserve it and repair manually`)
  return `${current.slice(0, start)}${block}${current.slice(finish + END.length)}`
}

const prepareFile = (plans, targetRoot, relative, content, manifest) => {
  const target = path.join(targetRoot, relative)
  if (!target.startsWith(`${targetRoot}${path.sep}`)) fail('UNSAFE_PATH', `managed destination escapes target: ${relative}`)
  const parts = relative.split(path.sep)
  let parent = targetRoot
  for (const part of parts.slice(0, -1)) {
    parent = path.join(parent, part)
    if (lstatOrNull(parent)?.isSymbolicLink()) fail('UNSAFE_PATH', `${relative}: destination parent is a symlink`)
  }
  if (lstatOrNull(target)?.isSymbolicLink()) fail('UNSAFE_PATH', `${relative}: destination is a symlink`)
  const expected = manifest?.files?.[relative]
  let current
  try { current = fs.readFileSync(target) } catch (error) { if (error.code !== 'ENOENT') fail('TARGET_UNREADABLE', `${relative}: cannot read destination: ${error.message}`) }
  if (current && expected && sha256(current) !== expected) fail('OWNERSHIP_CONFLICT', `${relative}: locally modified managed file; preserve it and retry after review`)
  if (current && !expected) fail('OWNERSHIP_CONFLICT', `${relative}: existing destination is not owned by SDW; preserve it and resolve the conflict manually`)
  const desired = Buffer.from(content)
  plans.push({ type: current ? (Buffer.compare(current, desired) === 0 ? 'unchanged' : 'update') : 'create', relative, content: desired, hash: sha256(desired) })
}

const prepareBlock = (plans, targetRoot, relative, block, manifest) => {
  const target = path.join(targetRoot, relative)
  if (lstatOrNull(target)?.isSymbolicLink()) fail('UNSAFE_PATH', `${relative}: destination is a symlink`)
  let current = ''
  try { current = fs.readFileSync(target, 'utf8') } catch (error) { if (error.code !== 'ENOENT') fail('TARGET_UNREADABLE', `${relative}: cannot read destination: ${error.message}`) }
  const content = replaceBlock(current, block, manifest?.blocks?.[relative], relative, manifest)
  plans.push({ type: current ? (content === current ? 'unchanged' : 'update') : 'create', relative, content: Buffer.from(content), hash: sha256(block), block: true })
}

const atomicWrite = (target, content) => {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.tmp`)
  try {
    fs.writeFileSync(temporary, content, { flag: 'wx', mode: 0o600 })
    if (process.env.SDW_TEST_INTERRUPT_BEFORE_RENAME === '1') throw new Error('injected interruption before rename')
    fs.renameSync(temporary, target)
  } catch (error) {
    try { fs.unlinkSync(temporary) } catch {}
    throw error
  }
}

const applyPlans = (plans, targetRoot, dryRun) => {
  for (const plan of plans) {
    if (plan.type === 'unchanged') {
      process.stdout.write(`Unchanged ${plan.relative}\n`)
      continue
    }
    process.stdout.write(`${dryRun ? 'Would ' : ''}${plan.type} ${plan.relative}\n`)
    if (!dryRun) {
      if (plan.type === 'remove') fs.unlinkSync(path.join(targetRoot, plan.relative))
      else atomicWrite(path.join(targetRoot, plan.relative), plan.content)
    }
  }
}

const main = async (values) => {
  const targetRoot = gitRoot()
  if (isSourceRepository(targetRoot)) fail('SOURCE_REPOSITORY_TARGET', 'refusing to install into the Spec Driven Workflow source repository')
  const manifest = readManifest(targetRoot)
  const tools = selectedTools(values.tools, manifest, values.command)
  const source = await loadSource(values)
  if (!source.remote && path.resolve(source.root) === path.resolve(targetRoot) && isSourceRepository(source.root)) fail('SOURCE_REPOSITORY_TARGET', 'source and target are the same Spec Driven Workflow source repository')
  const readFile = (relative) => readSourceFile(source, relative)
  const plans = []
  const desiredPaths = new Set([MANIFEST])

  for (const relative of ['runtime/sdw.mjs', 'runtime/agents.mjs', 'runtime/render.mjs', 'runtime/installer.mjs']) {
    const content = await readFile(relative)
    const destination = `.sdw/${path.basename(relative)}`
    desiredPaths.add(destination)
    prepareFile(plans, targetRoot, destination, content, manifest)
  }
  for (const agent of CANONICAL_AGENTS) {
    const content = await readFile(`agents/${agent}`)
    const destination = `.sdw/agents/${agent}`
    desiredPaths.add(destination)
    prepareFile(plans, targetRoot, destination, content, manifest)
  }
  const sharedContent = await readFile(`agents/${SHARED_WORKFLOW_FILE}`)
  const sharedDestination = `.sdw/agents/${SHARED_WORKFLOW_FILE}`
  desiredPaths.add(sharedDestination)
  prepareFile(plans, targetRoot, sharedDestination, sharedContent, manifest)
  for (const template of TEMPLATES) {
    const content = await readFile(`templates/${template}`)
    const destination = `.sdw/templates/${template}`
    desiredPaths.add(destination)
    prepareFile(plans, targetRoot, destination, content, manifest)
  }
  for (const doc of DOCS) {
    const content = await readFile(`docs/${doc}`)
    const destination = `.sdw/docs/${doc}`
    desiredPaths.add(destination)
    prepareFile(plans, targetRoot, destination, content, manifest)
  }

  const rendererLoaded = await loadRenderer(source, readFile)
  const renderer = rendererLoaded.module ?? rendererLoaded
  const rendererRoot = rendererLoaded.root ?? source.root
  for (const tool of tools) {
    for (const agent of CANONICAL_AGENTS) {
      const content = tool === 'codex' ? renderer.renderCodex(sourcePath(rendererRoot, `agents/${agent}`)) : renderer.renderOpenCode(sourcePath(rendererRoot, `agents/${agent}`))
      const destination = nativeRelative(tool, agent)
      desiredPaths.add(destination)
      prepareFile(plans, targetRoot, destination, content, manifest)
    }
  }
  prepareBlock(plans, targetRoot, 'AGENTS.md', bootstrapBlock(), manifest)

  if (manifest) {
    for (const relative of Object.keys(manifest.files)) {
      if (relative === MANIFEST || desiredPaths.has(relative)) continue
      const prunable = ['.codex/agents/', '.opencode/agents/', '.sdw/agents/']
      if (!prunable.some((prefix) => relative.startsWith(prefix))) continue
      const target = path.join(targetRoot, relative)
      if (!fs.existsSync(target)) continue
      const current = fs.readFileSync(target)
      if (sha256(current) !== manifest.files[relative]) fail('OWNERSHIP_CONFLICT', `${relative}: locally modified obsolete file; preserve it and remove it manually`)
      plans.push({ type: 'remove', relative })
    }
  }

  const files = {}
  for (const plan of plans) if (!plan.block && plan.type !== 'remove') files[plan.relative] = plan.hash
  const blocks = { 'AGENTS.md': sha256(bootstrapBlock()) }
  const nextManifest = {
    schema_version: 1,
    product: 'Spec Driven Workflow',
    version: VERSION,
    installed_at: manifest?.installed_at ?? new Date().toISOString(),
    source: { identity: source.identity, revision: source.remote ? null : gitRevision(source.root) },
    selected_tools: tools,
    files,
    blocks,
  }
  const manifestContent = `${JSON.stringify(nextManifest, null, 2)}\n`
  if (!manifest) {
    const manifestTarget = path.join(targetRoot, MANIFEST)
    if (fs.existsSync(manifestTarget)) fail('OWNERSHIP_CONFLICT', `${MANIFEST}: existing file is not a recognized SDW manifest`)
  }
  plans.push({ type: manifest ? 'update' : 'create', relative: MANIFEST, content: Buffer.from(manifestContent), hash: sha256(manifestContent) })
  applyPlans(plans, targetRoot, values.dryRun)
  process.stdout.write(`${values.dryRun ? 'Dry run complete' : `${values.command} complete`} for tools: ${tools.join(',')}\n`)
}

const nativeRelative = (tool, agent) => tool === 'codex' ? `.codex/agents/${agent.replace(/\.md$/u, '.toml')}` : `.opencode/agents/${agent}`

try {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) process.stdout.write(`${USAGE}\n`)
  else await main(args)
} catch (error) {
  process.stderr.write(`sdw installer: ${error.code ?? 'ERROR'}: ${error.message}\n`)
  process.exitCode = 1
}
