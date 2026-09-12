#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  AGENT_FILES,
  NEXT_FIELDS,
  NEXT_RESPONSIBILITIES,
  RECORD_FORMATS,
  RECORD_STATUSES,
} from './agents.mjs'

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))

const ARTIFACTS = Object.freeze({
  'scope.md': ['Objective', 'Rationale and Upstream Source', 'In Scope', 'Out of Scope', 'Constraints', 'Success'],
  'spec.md': ['Intended Behavior', 'Acceptance Criteria', 'Validation'],
  'plan.md': ['Approach', 'Verification Approach', 'Responsibilities and Stops', 'Risks'],
  'tasks.md': ['Stable Task IDs', 'Actionable Steps', 'Completion Evidence', 'Tasks'],
  'validation.md': ['Checks Run', 'Results', 'Limitations'],
  'retrospect.md': ['Outcome', 'What Worked', 'Friction', 'Follow-up'],
  'next.md': ['Agreement', 'Next action', 'Waiting on', 'Work context'],
  'review.md': ['Candidate', 'Findings', 'Checks', 'Conclusion'],
  'work.md': ['Purpose and Boundary', 'Intended Result', 'Approach', 'Actions and Progress', 'Checks and Results', 'Outcome and Lessons'],
})

// Normal-format activity requirements. Plan checks require scope/spec/plan and
// next, not tasks: task generation is a separate, later responsibility.
const ACTIVITY_FILES = Object.freeze({
  scope: ['scope.md'],
  spec: ['scope.md', 'spec.md'],
  plan: ['scope.md', 'spec.md', 'plan.md', 'next.md'],
  task: ['scope.md', 'spec.md', 'plan.md', 'tasks.md'],
  execute: ['scope.md', 'spec.md', 'plan.md', 'tasks.md', 'next.md'],
  validate: ['scope.md', 'spec.md', 'plan.md', 'tasks.md', 'validation.md', 'next.md'],
  review: ['scope.md', 'spec.md', 'plan.md', 'tasks.md', 'validation.md', 'next.md', 'review.md'],
  publish: ['validation.md', 'next.md'],
  finalize: ['tasks.md', 'validation.md', 'next.md'],
  retrospect: ['scope.md', 'spec.md', 'plan.md', 'tasks.md', 'validation.md', 'retrospect.md', 'next.md'],
  wrap: ['validation.md', 'retrospect.md', 'tasks.md', 'next.md'],
  handoff: ['next.md'],
})

// Compact work items use work.md + next.md for every working activity.
const COMPACT_ARTIFACTS = Object.freeze(['work.md', 'next.md'])
const CLOSURE_ACTIVITIES = new Set(['finalize', 'wrap'])

const AGENT_DIR = (() => {
  for (const candidate of [path.join(MODULE_DIR, 'agents'), path.resolve(MODULE_DIR, '..', 'agents')]) {
    try {
      if (fs.existsSync(path.join(candidate, 'sdw.workflow.md'))) return candidate
    } catch { /* probe the next candidate */ }
  }
  return path.join(MODULE_DIR, 'agents')
})()

const TEMPLATE_DIR = fs.existsSync(path.join(MODULE_DIR, 'templates'))
  ? path.join(MODULE_DIR, 'templates')
  : path.resolve(MODULE_DIR, '..', 'templates')

// A required section is unresolved only when every nonempty line of its body is
// template filler. A literal TODO quoted in real prose is valid content.
const UNRESOLVED_LINE = /^\s*(?:TODO|TBD|FIXME)\b[^\n]*$|^\s*\{\{[^}]+\}\}\s*$|^\s*\[fill[^\]]*\]\s*$/iu

class SdwError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const fail = (code, message) => {
  throw new SdwError(code, message)
}

const usage = () => `Usage:
  node .sdw/sdw.mjs init WORK_DIR [--format normal|compact]
  node .sdw/sdw.mjs start WORK_DIR OBJECTIVE [--format normal|compact]
  node .sdw/sdw.mjs save WORK_DIR ARTIFACT < CONTENT
  node .sdw/sdw.mjs check WORK_DIR ACTIVITY
  node .sdw/sdw.mjs resume WORK_DIR

Artifacts: ${Object.keys(ARTIFACTS).join(', ')}
Activities: ${Object.keys(ACTIVITY_FILES).join(', ')}
Record formats: normal (default), compact`

const readStdin = () => fs.readFileSync(0, 'utf8')

const rejectSymlinkComponents = (value) => {
  const parsed = path.parse(value)
  let cursor = parsed.root
  for (const component of value.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component)
    let stat
    try {
      stat = fs.lstatSync(cursor)
    } catch (error) {
      if (error.code === 'ENOENT') break
      fail('UNSAFE_PATH', `Could not inspect path component ${cursor}: ${error.message}`)
    }
    if (stat.isSymbolicLink()) fail('UNSAFE_PATH', `Path component must not be a symlink: ${cursor}`)
  }
}

const resolveWorkDir = (value, { create = false } = {}) => {
  if (typeof value !== 'string' || value.trim() === '') fail('WORK_DIR_REQUIRED', 'WORK_DIR is required')
  const resolved = path.resolve(value)
  rejectSymlinkComponents(path.dirname(resolved))
  let stat
  try {
    stat = fs.lstatSync(resolved)
  } catch (error) {
    if (error.code !== 'ENOENT' || !create) fail('WORK_DIR_INVALID', `Cannot inspect WORK_DIR ${resolved}: ${error.message}`)
  }
  if (stat?.isSymbolicLink() || stat && !stat.isDirectory()) fail('WORK_DIR_INVALID', `WORK_DIR must be a directory: ${resolved}`)
  if (create) fs.mkdirSync(resolved, { recursive: true })
  rejectSymlinkComponents(resolved)
  return fs.realpathSync(resolved)
}

const assertArtifact = (value) => {
  if (typeof value !== 'string' || value.includes('\0') || path.isAbsolute(value) || path.normalize(value) !== value) {
    fail('ARTIFACT_INVALID', `Artifact must be a named Markdown artifact: ${value || '(missing)'}`)
  }
  if (!Object.hasOwn(ARTIFACTS, value)) fail('ARTIFACT_INVALID', `Unsupported artifact: ${value}`)
  return value
}

const artifactPath = (workDir, artifact) => {
  assertArtifact(artifact)
  const target = path.join(workDir, artifact)
  if (path.dirname(target) !== workDir) fail('ARTIFACT_INVALID', `Artifact must be directly under WORK_DIR: ${artifact}`)
  return target
}

const readWorkFile = (workDir, artifact) => {
  try {
    if (fs.lstatSync(artifactPath(workDir, artifact)).isSymbolicLink()) {
      return { content: '', error: `symlinked destination` }
    }
    return { content: fs.readFileSync(artifactPath(workDir, artifact), 'utf8'), error: null }
  } catch (error) {
    if (error instanceof SdwError) return { content: '', error: error.message }
    return { content: '', error: 'missing or unreadable' }
  }
}

const meaningfulSection = (content, heading) => {
  const lines = content.split(/\r?\n/u)
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start < 0) return null
  const body = []
  for (let index = start + 1; index < lines.length && !/^##\s+/u.test(lines[index]) && !/^# /.test(lines[index]); index += 1) body.push(lines[index])
  return body.join('\n').trim()
}

const unresolvedSections = (content, heading) => {
  const body = meaningfulSection(content, heading)
  if (!body) return false
  return body.split(/\r?\n/u).filter((line) => line.trim() !== '').every((line) => UNRESOLVED_LINE.test(line))
}

// Parse the fixed S04 frontmatter of next.md. Deliberately small: plain
// key/value lines between --- markers, no YAML engine, no command evaluation.
const parseNextRecord = (content, workDir) => {
  const errors = []
  const lines = content.split(/\r?\n/u)
  while (lines.length && lines[0].trim() === '') lines.shift()
  if (lines[0]?.trim() !== '---') {
    return {
      record: null,
      errors: [`next.md: no fixed record fields (${NEXT_FIELDS.join(', ')}) found; inspect this unstructured record and explicitly upgrade it without inventing authority`],
      detected: 'unstructured',
    }
  }
  const closing = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (closing < 0) {
    return { record: null, errors: ['next.md: frontmatter is incomplete; close the --- block'], detected: 'broken' }
  }
  const stored = new Map()
  for (const [number, line] of lines.slice(1, closing).entries()) {
    if (line.trim() === '') continue
    const match = line.match(/^([A-Za-z_]+)\s*:\s*(.*)$/u)
    if (!match) {
      errors.push(`next.md: frontmatter line ${number + 1} is not 'key: value': ${line.trim()}`)
      continue
    }
    const key = match[1]
    const value = match[2].trim()
    if (!NEXT_FIELDS.includes(key)) errors.push(`next.md: unknown frontmatter field '${key}'; allowed fields are ${NEXT_FIELDS.join(', ')}`)
    else if (stored.has(key)) errors.push(`next.md: duplicate frontmatter field '${key}'`)
    else stored.set(key, value)
  }
  for (const key of NEXT_FIELDS) {
    if (!stored.has(key)) errors.push(`next.md: missing frontmatter field '${key}'`)
    else if (!stored.get(key)) errors.push(`next.md: frontmatter field '${key}' is empty`)
  }
  const record = { workId: null, format: null, nextAgent: null, status: null }
  if (stored.has('work_id') && stored.get('work_id')) {
    record.workId = stored.get('work_id')
    const expected = path.basename(workDir)
    if (record.workId !== expected) {
      errors.push(`next.md: work_id '${record.workId}' does not match the work directory name '${expected}'; reconcile the identity before continuing`)
    }
  }
  if (stored.has('record_format') && stored.get('record_format')) {
    const value = stored.get('record_format')
    if (!RECORD_FORMATS.includes(value)) errors.push(`next.md: record_format '${value}' is not one of ${RECORD_FORMATS.join(', ')}`)
    else record.format = value
  }
  if (stored.has('status') && stored.get('status')) {
    const value = stored.get('status')
    if (!RECORD_STATUSES.includes(value)) errors.push(`next.md: status '${value}' is not one of ${RECORD_STATUSES.join(', ')}`)
    else record.status = value
  }
  if (stored.has('next_agent') && stored.get('next_agent')) {
    const value = stored.get('next_agent')
    if (value === 'none') record.nextAgent = 'none'
    else if (!NEXT_RESPONSIBILITIES.includes(value)) errors.push(`next.md: next_agent '${value}' is not a canonical responsibility ('none' or one of ${NEXT_RESPONSIBILITIES.join(', ')})`)
    else record.nextAgent = value
  }
  // Status/next-agent coherence: complete pairs with next_agent none.
  if (record.status === 'complete' && record.nextAgent !== null && record.nextAgent !== 'none') {
    errors.push(`next.md: status 'complete' requires next_agent 'none'; found '${record.nextAgent}'`)
  }
  return { record, errors, detected: 'fixed' }
}

const agentPromptPath = (agent) => {
  if (agent === null || agent === 'none') return null
  return path.join(AGENT_DIR, `${agent}.md`)
}

const promptAvailability = (agent) => {
  const target = agentPromptPath(agent)
  if (!target) return { target: null, available: false }
  try {
    return { target, available: fs.lstatSync(target).isFile() && fs.readFileSync(target, 'utf8').trim().length > 0 }
  } catch {
    return { target, available: false }
  }
}

const taskDetails = (content) => {
  const entries = []
  const malformed = []
  const ids = new Map()
  for (const [number, line] of content.split(/\r?\n/u).entries()) {
    const checkbox = line.match(/^\s*-\s+\[([^\]]*)\]\s*(.*)$/u)
    if (!checkbox) continue
    const marker = checkbox[1]
    const rest = checkbox[2]
    const task = rest.match(/^(T\d{3,})\b(?:\s*[—-]\s*|\s+)(.*)$/u)
    if (![' ', 'x', 'X'].includes(marker) || !task || !task[2].trim()) {
      malformed.push(`tasks.md:${number + 1}: malformed task checkbox; use '- [ ] T123 — description' or '- [x] T123 — description'`)
      continue
    }
    const id = task[1]
    const item = { id, complete: marker.toLowerCase() === 'x', line: number + 1 }
    entries.push(item)
    ids.set(id, [...(ids.get(id) ?? []), item])
  }
  const duplicates = [...ids.entries()].filter(([, items]) => items.length > 1).map(([id]) => id)
  return { entries, malformed, duplicates, ids: new Set(ids.keys()) }
}

const referencedTaskIds = (content) => new Set(content.match(/\bT\d{3,}\b/gu) ?? [])

const taskConsistency = (reports) => {
  const errors = []
  const tasksReport = reports.find((report) => report.artifact === 'tasks.md')
  if (!tasksReport || tasksReport.errors.length) return errors
  const tasks = taskDetails(tasksReport.content)
  errors.push(...tasks.malformed, ...tasks.duplicates.map((id) => `tasks.md: duplicate task ID ${id}; keep one checklist entry`))
  for (const report of reports) {
    if (!['plan.md', 'tasks.md', 'next.md'].includes(report.artifact) || report.errors.length || report.artifact === 'tasks.md') continue
    for (const id of referencedTaskIds(report.content)) {
      if (!tasks.ids.has(id)) errors.push(`${report.artifact}: references undefined task ${id}; add it to tasks.md or repair the reference`)
    }
  }
  const countMatches = reports
    .filter((report) => ['plan.md', 'next.md'].includes(report.artifact) && !report.errors.length)
    .flatMap((report) => [...report.content.matchAll(/\b(?:completed|complete|done)\s+tasks?\s*[:=]\s*(\d+)\b/giu)].map((match) => ({ report, count: Number(match[1]) })))
  const completed = tasks.entries.filter((entry) => entry.complete).length
  for (const { report, count } of countMatches) {
    if (count !== completed) errors.push(`${report.artifact}: stale completed-task count ${count}; tasks.md has ${completed} checked task(s), update the prose`)
  }
  return errors
}

const recordConsistency = (reports) => {
  const errors = []
  const nextReport = reports.find((report) => report.artifact === 'next.md')
  if (!nextReport || nextReport.errors.length) return errors
  const parsed = parseNextRecord(nextReport.content, nextReport.workDir)
  if (parsed.detected === 'unstructured') {
    errors.push(...parsed.errors)
    return errors
  }
  for (const error of parsed.errors) errors.push(error)
  const { record } = parsed
  if (!record.status) return errors
  if (record.nextAgent === null) return errors
  if (record.status === 'waiting') {
    const waiting = meaningfulSection(nextReport.content, 'Waiting on') ?? ''
    if (/^\s*(?:nothing(?:\.| pending)?|none)\s*\.?\s*$/iu.test(waiting)) {
      errors.push('next.md: status is waiting but Waiting on claims nothing is pending; record the condition and its owner')
    }
  }
  return errors
}

// Honest closure checks. No prose phrase can certify that pending work was
// approved for deferral: pending tasks and unresolved blockers are reported.
const closureConsistency = (reports) => {
  const errors = []
  const tasksReport = reports.find((report) => report.artifact === 'tasks.md')
  const nextReport = reports.find((report) => report.artifact === 'next.md')
  if (!nextReport || nextReport.errors.length) return errors
  const parsed = parseNextRecord(nextReport.content, nextReport.workDir)
  const waitingOn = meaningfulSection(nextReport.content, 'Waiting on') ?? ''
  // Structural rule: a Waiting on that begins with the word "nothing" (with any
  // following context prose) records that nothing is pending. Any other text is
  // an unresolved condition and contradicts a 'complete' closure claim.
  const nothingRecorded = waitingOn === '' || /^nothing\b/iu.test(waitingOn.trim())
  if (parsed.record?.status === 'complete' && waitingOn && !nothingRecorded) {
    errors.push(`next.md: status is 'complete' but Waiting on names an unresolved condition (${JSON.stringify(waitingOn.slice(0, 120))}); resolve it or record status 'waiting' with the condition and its owner`)
  }
  if (!tasksReport || tasksReport.errors.length) return errors
  const pending = taskDetails(tasksReport.content).entries.filter((entry) => !entry.complete)
  if (pending.length) {
    errors.push(`tasks.md: ${pending.length} unchecked task(s) remain; closure requires honest completion or an explicit recorded deferral destination in next.md — review them before claiming closure`)
  }
  return errors
}

const taskProgress = (content) => {
  const details = taskDetails(content)
  return {
    total: details.entries.length,
    complete: details.entries.filter((entry) => entry.complete).length,
    pending: details.entries.filter((entry) => !entry.complete).length,
    malformed: details.malformed.length,
    duplicates: details.duplicates,
  }
}

const inspectArtifact = (workDir, artifact) => {
  const { content, error } = readWorkFile(workDir, artifact)
  const errors = []
  if (error) {
    errors.push(`${artifact}: ${error}; create or repair this file`)
    return { artifact, target: artifactPath(workDir, artifact), content: '', errors }
  }
  if (content.trim() === '') errors.push(`${artifact}: content is empty; provide the required artifact content`)
  for (const heading of ARTIFACTS[artifact]) {
    if (!content.split(/\r?\n/u).some((line) => line.trim() === `## ${heading}`)) {
      errors.push(`${artifact}: missing required section '## ${heading}'`)
    } else if (!meaningfulSection(content, heading)) {
      errors.push(`${artifact}: section '## ${heading}' is empty; add meaningful content`)
    } else if (artifact !== 'next.md' && unresolvedSections(content, heading)) {
      errors.push(`${artifact}: section '## ${heading}' still contains only unfinished template placeholders; refine it`)
    }
  }
  return { artifact, target: artifactPath(workDir, artifact), content, workDir, errors }
}

const validateContent = (workDir, artifact, content) => {
  if (typeof content !== 'string' || content.trim() === '') fail('CONTENT_REQUIRED', `${artifact}: content is required and cannot be empty`)
  for (const heading of ARTIFACTS[artifact]) {
    if (!content.split(/\r?\n/u).some((line) => line.trim() === `## ${heading}`)) fail('CONTENT_INVALID', `${artifact}: missing required section '## ${heading}'`)
    if (!meaningfulSection(content, heading)) fail('CONTENT_INVALID', `${artifact}: section '## ${heading}' is empty`)
    if (unresolvedSections(content, heading)) fail('CONTENT_INVALID', `${artifact}: section '## ${heading}' still contains only unfinished template placeholders; refine it before saving`)
  }
  if (artifact === 'next.md') {
    const parsed = parseNextRecord(content, workDir)
    for (const error of parsed.errors) fail('CONTENT_INVALID', error)
    if (parsed.detected !== 'fixed') fail('CONTENT_INVALID', 'next.md: fixed record fields (work_id, record_format, next_agent, status) are required')
  }
}

const atomicWrite = (target, content) => {
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`)
  try {
    fs.writeFileSync(temporary, content.endsWith('\n') ? content : `${content}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    const handle = fs.openSync(temporary, 'r')
    try { fs.fsyncSync(handle) } finally { fs.closeSync(handle) }
    if (process.env.SDW_TEST_INTERRUPT_BEFORE_RENAME === '1') fail('SAVE_INTERRUPTED', 'simulated interruption before atomic replacement')
    fs.renameSync(temporary, target)
  } catch (error) {
    try { fs.unlinkSync(temporary) } catch {}
    if (error instanceof SdwError) throw error
    fail('SAVE_FAILED', `Could not save ${target}: ${error.message}`)
  }
}

const initialScope = (objective) => `# Scope\n\n## Objective\n\n${objective}\n\n## Rationale and Upstream Source\n\nWhy this work contributes to a larger goal, and the upstream source/revision it serves.\n\n## In Scope\n\nDefine the smallest change needed to satisfy the objective.\n\n## Out of Scope\n\nUnrelated changes and follow-up ideas.\n\n## Constraints\n\nRespect repository instructions, user authority, and the current work item.\n\n## Success\n\nThe objective is implemented or resolved and the relevant checks pass.\n`

const initialNext = (workDir) => {
  const workId = path.basename(workDir)
  return `---\nwork_id: ${workId}\nrecord_format: normal\nnext_agent: none\nstatus: waiting\n---\n\n# Next\n\n## Agreement\n\nThe invoking SDW workflow session owns this new work item within the user's request; no broader authority is recorded yet.\n\n## Next action\n\nRefine scope.md against the objective and the repository context, then save the record.\n\n## Waiting on\n\nThe invoking SDW workflow session continues this work item now.\n\n## Work context\n\nCreated from the objective by node .sdw/sdw.mjs start; records live in this work directory.\n`
}

const initialWork = (objective) => `# Work\n\n## Purpose and Boundary\n\n${objective}\n\n## Intended Result\n\nThe smallest useful result for this bounded work.\n\n## Approach\n\nRecord the approach before acting.\n\n## Actions and Progress\n\nNo actions recorded yet.\n\n## Checks and Results\n\nNo checks run yet.\n\n## Outcome and Lessons\n\nPending.\n`

const compactNext = (workDir, objective) => {
  const workId = path.basename(workDir)
  return `---\nwork_id: ${workId}\nrecord_format: compact\nnext_agent: none\nstatus: waiting\n---\n\n# Next\n\n## Agreement\n\nThe invoking SDW workflow session owns this compact work item within the user's request.\n\n## Next action\n\nRefine work.md and this record; expand to normal records only with an explicit superseding decision.\n\n## Waiting on\n\nThe invoking SDW workflow session continues this work item now.\n\n## Work context\n\nCreated compactly from the objective by node .sdw/sdw.mjs start.\n`
}

const shapeConflict = (workDir, requested, existing) => {
  if (requested === existing) return null
  if (existing === null) return null
  fail('RECORD_SHAPE_CONFLICT', `This work item already uses '${existing}' records; init/start cannot silently change the record shape. Expand or document the change explicitly with a new superseding record instead.`)
}

const detectExistingShape = (workDir) => {
  const exists = (artifact) => { try { return fs.lstatSync(artifactPath(workDir, artifact)).isFile() } catch { return false } }
  if (exists('scope.md')) return 'normal'
  if (exists('work.md')) return 'compact'
  return null
}

const parseFormat = (args, command) => {
  const positional = []
  let format
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--format') {
      const value = args[++index]
      if (!value || !['normal', 'compact'].includes(value)) fail('FORMAT_INVALID', `--format requires 'normal' or 'compact'`)
      format = value
    } else positional.push(arg)
  }
  if (format === undefined) format = 'normal'
  if (format !== 'normal' && command !== 'init' && command !== 'start') fail('USAGE', `--format applies to init and start`)
  return { positional, format }
}

const init = (args) => {
  const { positional, format } = parseFormat(args, 'init')
  if (positional.length !== 1) fail('USAGE', `init takes WORK_DIR and optional --format\n${usage()}`)
  const workDir = resolveWorkDir(positional[0], { create: true })
  const existing = detectExistingShape(workDir)
  if (existing && existing !== format) fail('RECORD_SHAPE_CONFLICT', `This work item already uses '${existing}' records; init --format ${format} would silently change the record shape. Expand or supersede it explicitly instead.`)
  const created = []
  const preserved = []
  for (const artifact of format === 'compact' ? ['work.md', 'next.md'] : ['scope.md', 'next.md']) {
    const target = artifactPath(workDir, artifact)
    try {
      const stat = fs.lstatSync(target)
      if (stat.isSymbolicLink() || !stat.isFile()) fail('INIT_FAILED', `${artifact}: existing destination must be a regular file`)
      preserved.push(artifact)
    } catch (error) {
      if (error.code !== 'ENOENT') fail('INIT_FAILED', `${artifact}: cannot inspect destination: ${error.message}`)
      fs.copyFileSync(path.join(TEMPLATE_DIR, artifact), target, fs.constants.COPYFILE_EXCL)
      created.push(artifact)
    }
  }
  return `Initialized ${workDir}\nRecord format: ${format}\nCreated: ${created.join(', ') || '(none)'}\nPreserved: ${preserved.join(', ') || '(none)'}`
}

const start = (args) => {
  const { positional, format } = parseFormat(args, 'start')
  if (positional.length !== 2) fail('USAGE', `start takes WORK_DIR OBJECTIVE and optional --format\n${usage()}`)
  const objective = positional[1].trim()
  if (!objective) fail('OBJECTIVE_REQUIRED', 'OBJECTIVE is required')
  const workDir = resolveWorkDir(positional[0], { create: true })
  const existing = detectExistingShape(workDir)
  if (existing && existing !== format) fail('RECORD_SHAPE_CONFLICT', `This work item already uses '${existing}' records; start --format ${format} would silently change the record shape. Expand or supersede it explicitly instead.`)
  const created = []
  const preserved = []
  for (const [artifact, content] of format === 'compact'
    ? [['work.md', initialWork(objective)], ['next.md', compactNext(workDir, objective)]]
    : [['scope.md', initialScopeArtifact(objective)], ['next.md', startedNext(workDir, objective)]]) {
    const target = artifactPath(workDir, artifact)
    try {
      const stat = fs.lstatSync(target)
      if (stat.isSymbolicLink() || !stat.isFile()) fail('START_FAILED', `${artifact}: existing destination must be a regular file`)
      preserved.push(artifact)
    } catch (error) {
      if (error.code !== 'ENOENT') fail('START_FAILED', `${artifact}: cannot inspect destination: ${error.message}`)
      atomicWrite(target, content)
      created.push(artifact)
    }
  }
  return `Started ${workDir}\nRecord format: ${format}\nCreated: ${created.join(', ') || '(none)'}\nPreserved: ${preserved.join(', ') || '(none)'}`
}

const initialScopeArtifact = (objective) => initialScope(objective)

const startedNext = (workDir) => initialNext(workDir)

const save = (workDirValue, artifactValue) => {
  const workDir = resolveWorkDir(workDirValue)
  const artifact = assertArtifact(artifactValue)
  const content = readStdin()
  validateContent(workDir, artifact, content)
  const target = artifactPath(workDir, artifact)
  let previous
  try {
    const stat = fs.lstatSync(target)
    if (stat.isSymbolicLink()) fail('ARTIFACT_INVALID', `${artifact}: destination must not be a symlink`)
    if (!stat.isFile()) fail('ARTIFACT_INVALID', `${artifact}: destination must be a regular file`)
    previous = fs.readFileSync(target, 'utf8')
  } catch (error) {
    if (error instanceof SdwError) throw error
    if (error.code !== 'ENOENT') fail('ARTIFACT_INVALID', `${artifact}: cannot inspect destination: ${error.message}`)
  }
  const normalizedContent = content.endsWith('\n') ? content : `${content}\n`
  if (previous === normalizedContent) return `Unchanged ${artifact} in ${workDir}`
  atomicWrite(target, content)
  return `Saved ${artifact} in ${workDir}`
}

const check = (workDirValue, activity) => {
  const workDir = resolveWorkDir(workDirValue)
  if (!Object.hasOwn(ACTIVITY_FILES, activity)) fail('ACTIVITY_INVALID', `Unsupported activity '${activity}'; choose one of ${Object.keys(ACTIVITY_FILES).join(', ')}`)
  const recordProbe = readWorkFile(workDir, 'next.md')
  let required = []
  let format = 'normal'
  let row = null
  if (recordProbe.error === null) {
    const parsed = parseNextRecord(recordProbe.content, workDir)
    row = parsed
    if (parsed.record?.format === 'compact') format = 'compact'
  }
  if (format === 'compact' && activity !== 'handoff') {
    required = ['work.md', 'next.md']
  } else {
    required = [...ACTIVITY_FILES[activity]]
    if (activity === 'handoff') {
      const tasksState = readWorkFile(workDir, 'tasks.md')
      if (tasksState.error === null && parseNextRecord(recordProbe.content ?? '', workDir).detected !== 'compact') {
        try {
          fs.lstatSync(artifactPath(workDir, 'tasks.md'))
          required.push('tasks.md')
        } catch (error) {
          if (error.code !== 'ENOENT') required.push('tasks.md')
        }
      }
    }
  }
  const reports = required.map((artifact) => inspectArtifact(workDir, artifact))
  const errors = [
    ...reports.flatMap((report) => report.errors),
    ...taskConsistency(reports),
    ...recordConsistency(reports),
    ...(CLOSURE_ACTIVITIES.has(activity) ? closureConsistency(reports) : []),
  ]
  if (row && CLOSURE_ACTIVITIES.has(activity) && row.record?.status === 'complete' && format === 'normal') {
    const tasksReport = reports.find((report) => report.artifact === 'tasks.md')
    if (tasksReport && !tasksReport.errors.length) {
      const pending = taskDetails(tasksReport.content).entries.filter((entry) => !entry.complete).length
      if (pending) errors.push(`next.md: status is 'complete' but ${pending} task(s) remain unchecked; closure must be honest`)
    }
  }
  if (errors.length) {
    return [`Check failed for ${activity}:`, ...errors.map((error) => `- ${error}`)].join('\n')
  }
  const progressReport = reports.find((report) => report.artifact === 'tasks.md')
  const progress = progressReport ? taskProgress(progressReport.content) : null
  const suffix = progress ? `; tasks ${progress.complete}/${progress.total} complete, ${progress.pending} pending` : ''
  const agent = row?.record?.nextAgent ?? null
  const nextNote = agent === 'none' || agent === null
    ? ''
    : (() => {
      const prompt = promptAvailability(agent)
      return prompt.available ? `; next agent: ${agent} (prompt: ${prompt.target})` : `; next agent: ${agent} (prompt missing: ${prompt.target})`
    })()
  return `Check passed for ${activity} (${format} records): ${reports.map((report) => report.artifact).join(', ')}${suffix}${nextNote}`
}

const gitContext = (workDir) => {
  try {
    const root = execGit(['-C', workDir, 'rev-parse', '--show-toplevel'])
    const branch = execGit(['-C', root, 'branch', '--show-current']) || '(detached HEAD)'
    const revision = execGit(['-C', root, 'rev-parse', '--short', 'HEAD'])
    const status = execGit(['-C', root, 'status', '--short'])
    return `Git repository: ${root}\nBranch: ${branch}\nRevision: ${revision}\nChanges: ${status || '(clean)'}`
  } catch {
    return 'Git: unavailable for WORK_DIR'
  }
}

const execGit = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

const resume = (value) => {
  const workDir = resolveWorkDir(value)
  const available = Object.keys(ARTIFACTS).filter((artifact) => {
    try { return fs.lstatSync(artifactPath(workDir, artifact)).isFile() } catch { return false }
  })
  const reports = available.map((artifact) => inspectArtifact(workDir, artifact))
  const tasksReport = reports.find((report) => report.artifact === 'tasks.md')
  const progress = tasksReport ? taskProgress(tasksReport.content) : null
  const inconsistencies = [...reports.flatMap((report) => report.errors), ...taskConsistency(reports), ...recordConsistency(reports)]

  let recordNote = '(no next.md record)'
  let promptNote = ''
  const nextProbe = readWorkFile(workDir, 'next.md')
  if (nextProbe.error === null) {
    const parsed = parseNextRecord(nextProbe.content, workDir)
    if (parsed.detected === 'unstructured') {
      recordNote = 'Record fields: none — unstructured next.md; inspect it and explicitly upgrade without fabricating authority'
      inconsistencies.push(...parsed.errors)
    } else if (parsed.record) {
      const { record } = parsed
      recordNote = `Record fields: work_id ${record.workId ?? '(missing)'} (${record.workId === path.basename(workDir) ? 'matches directory' : 'does not match directory'}), record_format ${record.format ?? '(unknown)'}, next_agent ${record.nextAgent ?? '(unknown)'}, status ${record.status ?? '(unknown)'}`
      if (record.nextAgent && record.nextAgent !== 'none') {
        const prompt = promptAvailability(record.nextAgent)
        promptNote = prompt.available
          ? `Next prompt: ${prompt.target}`
          : `Next prompt: missing for ${record.nextAgent}; expected at ${prompt.target}`
      }
    }
  }
  const taskLine = progress
    ? `Tasks: ${progress.complete}/${progress.total} complete; ${progress.pending} pending${progress.malformed || progress.duplicates.length ? ' (malformed/duplicate entries detected)' : ''}`
    : 'Tasks: no tasks.md record'
  return [
    gitContext(workDir),
    `Work directory: ${workDir}`,
    recordNote,
    promptNote,
    `Artifacts: ${available.join(', ') || '(none)'}`,
    taskLine,
    `Inconsistencies: ${inconsistencies.length ? inconsistencies.join(' | ') : '(none detected)'}`,
    'Resume is read-only; inspect and repair artifacts with explicit saves before continuing.',
  ].filter(Boolean).join('\n')
}

const main = () => {
  const [command, ...args] = process.argv.slice(2)
  if (!command || command === '--help' || command === '-h') {
    process.stdout.write(`${usage()}\n`)
    return
  }
  let result
  if (command === 'init') result = init(args)
  else if (command === 'start') result = start(args)
  else if (command === 'save' && args.length === 2) result = save(args[0], args[1])
  else if (command === 'check' && args.length === 2) result = check(args[0], args[1])
  else if (command === 'resume' && args.length === 1) result = resume(args[0])
  else fail('USAGE', `Invalid arguments.\n${usage()}`)
  process.stdout.write(`${result}\n`)
  if (command === 'check' && result.startsWith('Check failed')) process.exitCode = 1
}

try {
  main()
} catch (error) {
  process.stderr.write(`sdw: ${error.code ?? 'ERROR'}: ${error.message}\n`)
  process.exitCode = 1
}
