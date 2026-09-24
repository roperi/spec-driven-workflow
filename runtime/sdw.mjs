#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  AGENT_FILES,
  CLOSURE_KINDS,
  NEXT_ALL_FIELDS,
  NEXT_FIELDS,
  NEXT_RESPONSIBILITIES,
  PENDING_RECORD_STATUSES,
  RECORD_FORMATS,
  RECORD_STATUSES,
  TERMINAL_RECORD_STATUSES,
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

// Normal completion is proportional to the declared lifecycle path. These are
// the responsibilities whose artifacts a normal record must carry once it has
// advanced past them (canonical lifecycle order = NEXT_RESPONSIBILITIES order).
const REQUIRED_ARTIFACT_RESPONSIBILITIES = Object.freeze({
  'sdw.review': 'review.md',
  'sdw.retrospect': 'retrospect.md',
})

// A declared closure exception replaces the full finalize/wrap input set with
// the bounded artifacts its endpoint genuinely produces; compact work never
// reaches this table because it bypasses the closure contract.
const CLOSURE_ACTIVITY_FILES = Object.freeze({
  'planning-only': Object.freeze({
    finalize: Object.freeze(['scope.md', 'spec.md', 'plan.md', 'next.md']),
    wrap: Object.freeze(['scope.md', 'spec.md', 'plan.md', 'next.md']),
  }),
  parked: Object.freeze({ finalize: Object.freeze(['next.md']), wrap: Object.freeze(['next.md']) }),
  interrupted: Object.freeze({ finalize: Object.freeze(['next.md']), wrap: Object.freeze(['next.md']) }),
  superseded: Object.freeze({ finalize: Object.freeze(['next.md']), wrap: Object.freeze(['next.md']) }),
  abandoned: Object.freeze({ finalize: Object.freeze(['next.md']), wrap: Object.freeze(['next.md']) }),
})

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
  node .sdw/sdw.mjs reconcile WORK_DIR

Artifacts: ${Object.keys(ARTIFACTS).join(', ')}
Activities: ${Object.keys(ACTIVITY_FILES).join(', ')}
Record formats: normal (default), compact
Record statuses: ${RECORD_STATUSES.join(', ')}
Closure kinds: ${CLOSURE_KINDS.join(', ')}`

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
    if (!NEXT_ALL_FIELDS.includes(key)) errors.push(`next.md: unknown frontmatter field '${key}'; allowed fields are ${NEXT_ALL_FIELDS.join(', ')}`)
    else if (stored.has(key)) errors.push(`next.md: duplicate frontmatter field '${key}'`)
    else stored.set(key, value)
  }
  for (const key of NEXT_FIELDS) {
    if (!stored.has(key)) errors.push(`next.md: missing frontmatter field '${key}'`)
    else if (!stored.get(key)) errors.push(`next.md: frontmatter field '${key}' is empty`)
  }
  const record = { workId: null, format: null, nextAgent: null, status: null, closure: 'full', branch: null, candidate: null, durability: null }
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
  // Status/next-agent coherence: terminal statuses pair with next_agent none;
  // 'reconcile' is a pending responsibility and cannot pair with none.
  if (TERMINAL_RECORD_STATUSES.includes(record.status) && record.nextAgent !== null && record.nextAgent !== 'none') {
    errors.push(`next.md: status '${record.status}' requires next_agent 'none'; found '${record.nextAgent}'`)
  }
  if (record.status === 'reconcile' && record.nextAgent === 'none') {
    errors.push(`next.md: status 'reconcile' requires a next responsibility; found 'none'`)
  }
  // The optional closure field declares the completion path for normal records;
  // absent or empty it defaults to 'full' so records written before this field
  // stay readable. Compact records bypass the closure contract entirely, so the
  // field is neither validated nor applied to them.
  if (record.format !== 'compact' && stored.has('closure') && stored.get('closure')) {
    const value = stored.get('closure')
    if (!CLOSURE_KINDS.includes(value)) errors.push(`next.md: closure '${value}' is not one of ${CLOSURE_KINDS.join(', ')}`)
    else record.closure = value
  }
  // Closure/status coherence: an exception closure is a non-complete endpoint.
  if (record.format !== 'compact') {
    if (record.closure === 'parked' && record.status !== 'waiting') {
      errors.push(`next.md: closure 'parked' requires status 'waiting'; found '${record.status ?? 'none'}'`)
    }
    if (record.closure === 'interrupted' && !['waiting', 'abandoned'].includes(record.status)) {
      errors.push(`next.md: closure 'interrupted' requires status 'waiting' or 'abandoned'; found '${record.status ?? 'none'}'`)
    }
    if (['superseded', 'abandoned'].includes(record.closure) && record.status !== 'abandoned') {
      errors.push(`next.md: closure '${record.closure}' requires status 'abandoned'; found '${record.status ?? 'none'}'`)
    }
  }
  // Optional durable-continuity references. They are recorded values only; the
  // helper resolves them against live Git state in durabilityAssessment and
  // never infers a durable location from prose.
  for (const field of ['branch', 'candidate', 'durability']) {
    if (stored.has(field) && stored.get(field)) record[field] = stored.get(field)
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

const lifecycleIndex = (responsibility) => NEXT_RESPONSIBILITIES.indexOf(responsibility)

const artifactPresent = (workDir, artifact) => {
  try { return fs.lstatSync(artifactPath(workDir, artifact)).isFile() } catch { return false }
}

// The declared position of a normal record in the canonical lifecycle.
// `next_agent` names the responsibility about to be performed, so its index is
// the position *before* that responsibility; a required artifact R is demanded
// only when position > index(R), i.e. R has already been passed. A complete
// record has passed every responsibility, and anything else has no declared
// position.
const recordPosition = (record) => {
  if (record.status === 'complete') return NEXT_RESPONSIBILITIES.length
  if (record.nextAgent && record.nextAgent !== 'none') return lifecycleIndex(record.nextAgent)
  return -1
}

// Normal completion is proportional to the declared lifecycle path. A `full`
// record that has advanced past the review or retrospect responsibility must
// carry that responsibility's artifact. A declared exception closure
// (`planning-only`, `parked`, `interrupted`, `superseded`, `abandoned`) bounds
// the endpoint, so its required set stays the closure-activity set rather than
// the full path. Compact records bypass this contract entirely.
const completionContract = (workDir, record) => {
  const errors = []
  if (record.format !== 'normal') return errors
  if (record.closure !== 'full') return errors
  const position = recordPosition(record)
  if (position < 0) return errors
  for (const [responsibility, artifact] of Object.entries(REQUIRED_ARTIFACT_RESPONSIBILITIES)) {
    if (position <= lifecycleIndex(responsibility)) continue
    if (artifactPresent(workDir, artifact)) continue
    if (record.status === 'complete') {
      errors.push(`next.md: status 'complete' requires ${artifact} (the ${responsibility} responsibility) or a recorded closure exception; add the artifact or set closure 'planning-only'`)
    } else {
      errors.push(`next.md: next_agent '${record.nextAgent}' is past the ${responsibility} responsibility, but ${artifact} is absent; add the artifact or record a closure exception`)
    }
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
  if (PENDING_RECORD_STATUSES.includes(record.status)) {
    const waiting = meaningfulSection(nextReport.content, 'Waiting on') ?? ''
    if (/^\s*(?:nothing(?:\.| pending)?|none)\s*\.?\s*$/iu.test(waiting)) {
      const guidance = record.status === 'abandoned'
        ? 'record why the work was abandoned or superseded'
        : record.status === 'reconcile'
          ? 'record the observed condition and its evidence source'
          : 'record the condition and its owner'
      errors.push(`next.md: status is '${record.status}' but Waiting on claims nothing is pending; ${guidance}`)
    }
  }
  errors.push(...completionContract(nextReport.workDir, record))
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
  // An abandoned work item never completed its tasks; its recorded reason and
  // terminal status are checked elsewhere. Every other closure still requires
  // honest completion.
  if (parsed.record?.status === 'abandoned') return errors
  const pending = taskDetails(tasksReport.content).entries.filter((entry) => !entry.complete)
  if (pending.length) {
    errors.push(`tasks.md: ${pending.length} unchecked task(s) remain; closure requires honest completion or an explicit recorded deferral destination in next.md — review them before claiming closure`)
  }
  return errors
}

// Progressive assurance: bounded line parsers for the frozen hardened grammar.
// These establish syntax, IDs, mappings, required fields, declared oracle/status
// coherence, and summaries only. They never judge prose, infer approval or
// independence, or execute project commands.
const ASSURANCE_PROFILES = Object.freeze(['standard', 'hardened'])
const HARDENED_KINDS = Object.freeze(['positive', 'negative', 'failure-injection', 'end-to-end', 'manual', 'external'])
const HARDENED_RESULT_STATUSES = Object.freeze(['PASS', 'FAIL', 'BLOCKED', 'SKIPPED'])
const HARDENED_CONTEXTS = Object.freeze(['self', 'fresh', 'independent'])
const HARDENED_SUMMARIES = Object.freeze(['PASS', 'FAIL', 'BLOCKED'])
const HARDENED_ORACLE_MATCHES = Object.freeze(['yes', 'no', 'unknown'])
const HARDENED_PLAN_FIELDS = Object.freeze([
  'Authoritative state', 'Mutation points', 'Preconditions', 'Postconditions',
  'Preserved invariants', 'Recovery states', 'Unchanged-state comparison', 'Known limitations',
])
const HARDENED_V_FIELDS = Object.freeze(['Proves', 'Kind', 'Stimulus', 'Expected'])
const HARDENED_TASK_FIELDS = Object.freeze([
  'Satisfies', 'Verifies', 'Depends on', 'Cohesion group', 'Authority',
  'Mutation boundary', 'Preserved invariants', 'Adversarial cases', 'Completion check', 'Evidence',
])
const HARDENED_RESULT_FIELDS = Object.freeze([
  'Proves', 'Source', 'Expected', 'Observed', 'Resulting state', 'Oracle matched', 'Evidence', 'Limitations',
])
const HARDENED_ACTIVITY_FILES = Object.freeze({
  plan: ['spec.md', 'plan.md'],
  task: ['spec.md', 'plan.md', 'tasks.md'],
  execute: ['spec.md', 'plan.md', 'tasks.md'],
  handoff: ['spec.md', 'plan.md', 'tasks.md', 'validation.md'],
  validate: ['spec.md', 'plan.md', 'tasks.md', 'validation.md'],
  review: ['spec.md', 'plan.md', 'tasks.md', 'validation.md'],
  publish: ['plan.md', 'tasks.md', 'validation.md'],
  finalize: ['plan.md', 'tasks.md', 'validation.md'],
  retrospect: ['spec.md', 'plan.md', 'tasks.md', 'validation.md'],
  wrap: ['plan.md', 'tasks.md', 'validation.md'],
  resume: ['spec.md', 'plan.md', 'tasks.md', 'validation.md'],
})
const HARDENED_RESULT_ACTIVITIES = new Set(['validate', 'review', 'publish', 'finalize', 'retrospect', 'wrap'])
const HARDENED_ID = Object.freeze({
  AC: /^AC(?!000)\d{3}$/u,
  V: /^V(?!000)\d{3}$/u,
  T: /^T(?!000)\d{3}$/u,
  G: /^G(?!000)\d{3}$/u,
  N: /^N(?!000)\d{3}$/u,
})
const HARDENED_PLACEHOLDER = /^(?:TODO|TBD|FIXME|pending)$/iu

const diagnostic = (code, artifact, line, message) => `[${code}] ${artifact}${line ? `:${line}` : ''}: ${message}`

// A duplicate-section diagnostic should point at the offending second heading.
const duplicateHeadingLine = (section) => (section.ranges?.[1]?.start ?? section.start ?? 0) + 1

const HARDENED_STRUCTURAL_NOTE = 'assurance hardened; structural traceability only — semantic correctness, approval, and validation independence were not established'

// The frozen grammar ignores only surrounding ASCII whitespace on declaration
// lines; JavaScript trim() would also fold Unicode whitespace.
const asciiTrim = (value) => value.replace(/^[ \t\v\f\r]+|[ \t\v\f\r]+$/gu, '')

const hardenedProse = (value) => {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return trimmed !== '' && !HARDENED_PLACEHOLDER.test(trimmed)
}

const parseIdList = (value, prefix) => {
  const parts = value.split(', ')
  if (parts.some((part) => part === '' || !HARDENED_ID[prefix].test(part))) return { error: 'malformed' }
  if (new Set(parts).size !== parts.length) return { error: 'duplicate' }
  return { ids: parts }
}

const fencedLineMask = (lines) => {
  const mask = new Array(lines.length).fill(false)
  let fence = null
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (fence === null) {
      const open = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u)
      // A backtick fence info string may not itself contain a backtick.
      if (open && !(open[1][0] === '`' && open[2].includes('`'))) {
        fence = { marker: open[1][0], length: open[1].length }
        mask[index] = true
      }
      continue
    }
    mask[index] = true
    const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/u)
    if (close && close[1][0] === fence.marker && close[1].length >= fence.length) fence = null
  }
  return mask
}

// Exact headings only, fenced content excluded, and every matching range is
// returned so duplicate/authority decisions see the same evidence.
const sectionDetails = (content, heading) => {
  const lines = content.split(/\r?\n/u)
  const mask = fencedLineMask(lines)
  const indexes = []
  for (let index = 0; index < lines.length; index += 1) {
    if (mask[index]) continue
    if (lines[index] === `## ${heading}`) indexes.push(index)
  }
  const ranges = indexes.map((start) => {
    let end = lines.length
    for (let index = start + 1; index < lines.length; index += 1) {
      if (mask[index]) continue
      if (/^##(?:\s|$)/u.test(lines[index]) || /^#(?:\s|$)/u.test(lines[index])) { end = index; break }
    }
    return { start, end }
  })
  const first = ranges[0] ?? null
  return {
    heading,
    found: ranges.length > 0,
    duplicate: ranges.length > 1,
    start: first?.start ?? -1,
    end: first?.end ?? -1,
    ranges,
    lines,
    mask,
  }
}

const lineIsSkippable = (line, mask, index) => mask[index] || line.trim() === '' || /^\s*>/u.test(line)

const parseAssuranceDeclarations = (content) => {
  const section = sectionDetails(content, 'Assurance')
  const result = { section, declaration: null, value: null, malformed: [], duplicates: [] }
  if (!section.found) return result
  const seen = []
  for (const range of section.ranges) {
    for (let index = range.start + 1; index < range.end; index += 1) {
      if (lineIsSkippable(section.lines[index], section.mask, index)) continue
      const stripped = asciiTrim(section.lines[index])
      if (!/^Assurance profile\b/u.test(stripped)) continue
      const match = stripped.match(/^Assurance profile: (standard|hardened)$/u)
      if (!match) { result.malformed.push({ line: index + 1, text: stripped }); continue }
      seen.push({ line: index + 1, value: match[1] })
    }
  }
  if (seen.length > 1) result.duplicates = seen
  else if (seen.length === 1) { result.declaration = seen[0]; result.value = seen[0].value }
  return result
}

const parseHardenedSpec = (content) => {
  const errors = []
  const acs = new Map()
  const vs = new Map()
  const rawVs = []
  const lines = content.split(/\r?\n/u)
  const mask = fencedLineMask(lines)

  const acSection = sectionDetails(content, 'Acceptance Criteria')
  if (acSection.duplicate) errors.push(diagnostic('HARDENED_SECTION_DUPLICATE', 'spec.md', duplicateHeadingLine(acSection), 'spec.md has more than one exact ## Acceptance Criteria heading'))
  if (acSection.found) {
    for (let index = acSection.start + 1; index < acSection.end; index += 1) {
      if (lineIsSkippable(lines[index], mask, index)) continue
      const line = lines[index]
      const match = line.match(/^- (AC\S*) — (.+)$/u)
      const id = match?.[1] ?? ''
      if (!match || !HARDENED_ID.AC.test(id) || !hardenedProse(match[2])) {
        errors.push(diagnostic('HARDENED_AC_ID_MALFORMED', 'spec.md', index + 1, `'${line.trim()}' is not a valid '- AC001 — prose' acceptance entry`))
        continue
      }
      if (acs.has(id)) { errors.push(diagnostic('HARDENED_AC_DUPLICATE', 'spec.md', index + 1, `acceptance criterion ${id} is defined more than once`)); continue }
      acs.set(id, { id, prose: match[2].trim(), line: index + 1 })
    }
  }
  if (acs.size === 0) errors.push(diagnostic('HARDENED_AC_ID_MALFORMED', 'spec.md', acSection.found ? acSection.start + 1 : 1, 'the exact ## Acceptance Criteria section has no valid AC entry'))

  const vSection = sectionDetails(content, 'Validation')
  if (vSection.duplicate) errors.push(diagnostic('HARDENED_SECTION_DUPLICATE', 'spec.md', duplicateHeadingLine(vSection), 'spec.md has more than one exact ## Validation heading'))
  if (vSection.found) {
    let index = vSection.start + 1
    while (index < vSection.end) {
      if (lineIsSkippable(lines[index], mask, index)) { index += 1; continue }
      const line = lines[index]
      if (line.startsWith('  - ')) {
        errors.push(diagnostic('HARDENED_V_FIELD_MISSING', 'spec.md', index + 1, `unexpected verification child line '${line.trim()}' without an entry`))
        index += 1
        continue
      }
      const entry = line.match(/^- (V\S*) — (.+)$/u)
      const id = entry?.[1] ?? ''
      if (!entry || !HARDENED_ID.V.test(id) || !hardenedProse(entry[2])) {
        errors.push(diagnostic('HARDENED_V_ID_MALFORMED', 'spec.md', index + 1, `'${line.trim()}' is not a valid '- V001 — prose' verification entry`))
        index += 1
        continue
      }
      const v = { id, prose: entry[2].trim(), line: index + 1, proves: null, kind: null, stimulus: null, expected: null }
      index += 1
      const seen = []
      let sawBlank = false
      let blankFlagged = false
      while (index < vSection.end) {
        if (mask[index] || /^\s*>/u.test(lines[index])) { index += 1; continue }
        const child = lines[index]
        if (child.trim() === '') { sawBlank = true; index += 1; continue }
        if (child.startsWith('- ')) break
        if (!child.startsWith('  - ')) {
          errors.push(diagnostic('HARDENED_V_FIELD_MISSING', 'spec.md', index + 1, `${id} has an unexpected child line '${child.trim()}'`))
          index += 1
          continue
        }
        if (sawBlank && !blankFlagged) {
          errors.push(diagnostic('HARDENED_V_FIELD_MISSING', 'spec.md', index + 1, `${id} has a blank line inside its entry`))
          blankFlagged = true
        }
        const field = child.match(/^  - ([^:]+):(?: (.*))?$/u)
        if (!field) {
          errors.push(diagnostic('HARDENED_V_FIELD_MISSING', 'spec.md', index + 1, `${id} has an unexpected child line '${child.trim()}'`))
          index += 1
          continue
        }
        const label = field[1]
        const value = (field[2] ?? '').trim()
        if (!HARDENED_V_FIELDS.includes(label)) {
          errors.push(diagnostic('HARDENED_V_FIELD_MISSING', 'spec.md', index + 1, `${id} has unknown field '${label}'`))
          index += 1
          continue
        }
        if (seen.includes(label)) {
          errors.push(diagnostic('HARDENED_V_FIELD_MISSING', 'spec.md', index + 1, `${id} repeats field '${label}'`))
          index += 1
          continue
        }
        if (HARDENED_V_FIELDS.indexOf(label) !== seen.length) {
          errors.push(diagnostic('HARDENED_V_FIELD_MISSING', 'spec.md', index + 1, `${id} field '${label}' is out of order`))
        }
        seen.push(label)
        if (!hardenedProse(value)) {
          errors.push(diagnostic('HARDENED_V_FIELD_MISSING', 'spec.md', index + 1, `${id} field '${label}' is empty or placeholder-only`))
          index += 1
          continue
        }
        if (label === 'Proves') {
          const proves = parseIdList(value, 'AC')
          if (proves.error) errors.push(diagnostic('HARDENED_V_FIELD_MISSING', 'spec.md', index + 1, `${id} Proves is not a valid AC ID list (${proves.error})`))
          else v.proves = proves.ids
        } else if (label === 'Kind') {
          if (!HARDENED_KINDS.includes(value)) errors.push(diagnostic('HARDENED_V_KIND_INVALID', 'spec.md', index + 1, `${id} kind '${value}' is not one of ${HARDENED_KINDS.join(', ')}`))
          else v.kind = value
        } else if (label === 'Stimulus') v.stimulus = value
        else v.expected = value
        index += 1
      }
      for (const label of HARDENED_V_FIELDS) {
        if (!seen.includes(label)) errors.push(diagnostic('HARDENED_V_FIELD_MISSING', 'spec.md', v.line, `${id} is missing required field '${label}'`))
      }
      if (vs.has(id)) errors.push(diagnostic('HARDENED_V_DUPLICATE', 'spec.md', v.line, `verification case ${id} is defined more than once`))
      else { vs.set(id, v); rawVs.push(v) }
    }
  }
  if (vs.size === 0) errors.push(diagnostic('HARDENED_V_ID_MALFORMED', 'spec.md', vSection.found ? vSection.start + 1 : 1, 'the exact ## Validation section has no valid V entry'))

  if (errors.length === 0) {
    for (const v of rawVs) {
      if (!v.proves) continue
      for (const ac of v.proves) {
        if (!acs.has(ac)) errors.push(diagnostic('HARDENED_AC_UNDEFINED', 'spec.md', v.line, `${v.id} references undefined acceptance criterion ${ac}`))
      }
    }
    for (const ac of acs.values()) {
      if (!rawVs.some((v) => v.proves?.includes(ac.id))) errors.push(diagnostic('HARDENED_AC_UNROUTED', 'spec.md', ac.line, `acceptance criterion ${ac.id} has no verification case`))
    }
  }
  return { errors, acs, vs, rawVs }
}

const parseHardenedPlan = (content) => {
  const errors = []
  const groups = new Map()
  const lines = content.split(/\r?\n/u)
  const mask = fencedLineMask(lines)
  const assurance = sectionDetails(content, 'Assurance')
  if (assurance.duplicate) errors.push(diagnostic('HARDENED_SECTION_DUPLICATE', 'plan.md', duplicateHeadingLine(assurance), 'plan.md has more than one exact ## Assurance heading'))
  const values = new Map()
  const seen = []
  if (assurance.found) {
    let blockStarted = false
    let sawBlank = false
    let blankFlagged = false
    for (let index = assurance.start + 1; index < assurance.end; index += 1) {
      if (mask[index] || /^\s*>/u.test(lines[index])) continue
      const line = lines[index]
      if (line.trim() === '') { sawBlank = true; continue }
      const declarationLine = /^Assurance profile\b/u.test(asciiTrim(line))
      if (sawBlank && blockStarted && !blankFlagged) {
        errors.push(diagnostic('HARDENED_PLAN_FIELD_MISSING', 'plan.md', index + 1, 'the Assurance block has a blank line inside it'))
        blankFlagged = true
      }
      sawBlank = false
      blockStarted = true
      if (declarationLine) continue
      const match = line.match(/^- ([^:]+): (.*)$/u)
      if (!match) { errors.push(diagnostic('HARDENED_PLAN_FIELD_MISSING', 'plan.md', index + 1, `unexpected Assurance line '${line.trim()}'`)); continue }
      const label = match[1]
      const value = (match[2] ?? '').trim()
      if (!HARDENED_PLAN_FIELDS.includes(label)) { errors.push(diagnostic('HARDENED_PLAN_FIELD_MISSING', 'plan.md', index + 1, `unknown Assurance field '${label}'`)); continue }
      if (seen.includes(label)) { errors.push(diagnostic('HARDENED_PLAN_FIELD_MISSING', 'plan.md', index + 1, `duplicate Assurance field '${label}'`)); continue }
      if (HARDENED_PLAN_FIELDS.indexOf(label) !== seen.length) errors.push(diagnostic('HARDENED_PLAN_FIELD_MISSING', 'plan.md', index + 1, `Assurance field '${label}' is out of order`))
      seen.push(label)
      if (!hardenedProse(value) || value.toLowerCase() === 'none') {
        errors.push(diagnostic('HARDENED_PLAN_FIELD_MISSING', 'plan.md', index + 1, `Assurance field '${label}' is empty, placeholder-only, or an unqualified 'none'`))
        continue
      }
      values.set(label, value)
    }
  }
  for (const label of HARDENED_PLAN_FIELDS) {
    if (!seen.includes(label)) errors.push(diagnostic('HARDENED_PLAN_FIELD_MISSING', 'plan.md', assurance.start + 1, `plan is missing required Assurance field '${label}'`))
  }

  const groupSection = sectionDetails(content, 'Cohesion Groups')
  if (groupSection.duplicate) errors.push(diagnostic('HARDENED_SECTION_DUPLICATE', 'plan.md', duplicateHeadingLine(groupSection), 'plan.md has more than one exact ## Cohesion Groups heading'))
  if (!groupSection.found) {
    errors.push(diagnostic('HARDENED_GROUP_ID_MALFORMED', 'plan.md', 1, 'plan.md has no ## Cohesion Groups section'))
  } else {
    let entries = 0
    let noneEntry = null
    for (let index = groupSection.start + 1; index < groupSection.end; index += 1) {
      if (lineIsSkippable(lines[index], mask, index)) continue
      const line = lines[index]
      if (!line.startsWith('- ')) { errors.push(diagnostic('HARDENED_GROUP_ID_MALFORMED', 'plan.md', index + 1, `unexpected Cohesion Groups line '${line.trim()}'`)); continue }
      const noneMatch = line.match(/^- none — (.+)$/u)
      if (noneMatch && hardenedProse(noneMatch[1])) {
        if (noneEntry) errors.push(diagnostic('HARDENED_GROUP_DUPLICATE', 'plan.md', index + 1, 'Cohesion Groups repeats the reasoned none entry'))
        else noneEntry = { line: index + 1 }
        entries += 1
        continue
      }
      const match = line.match(/^- (G\S*) — (.+)$/u)
      const id = match?.[1] ?? ''
      if (!match || !HARDENED_ID.G.test(id) || !hardenedProse(match[2])) {
        errors.push(diagnostic('HARDENED_GROUP_ID_MALFORMED', 'plan.md', index + 1, `'${line.trim()}' is not a valid '- G001 — prose' or '- none — reason' entry`))
        continue
      }
      if (groups.has(id)) errors.push(diagnostic('HARDENED_GROUP_DUPLICATE', 'plan.md', index + 1, `cohesion group ${id} is defined more than once`))
      else groups.set(id, { id, prose: match[2].trim(), line: index + 1 })
      entries += 1
    }
    if (noneEntry && groups.size > 0) errors.push(diagnostic('HARDENED_GROUP_DUPLICATE', 'plan.md', noneEntry.line, `Cohesion Groups mixes a none entry with ${[...groups.keys()].join(', ')}`))
    if (entries === 0) errors.push(diagnostic('HARDENED_GROUP_ID_MALFORMED', 'plan.md', groupSection.start + 1, 'Cohesion Groups has no valid entry'))
  }
  return { errors, groups, values }
}

const parseHardenedTasks = (content, spec, groups, activity) => {
  const errors = []
  const tasks = new Map()
  const rawTasks = []
  const audit = []
  const lines = content.split(/\r?\n/u)
  const mask = fencedLineMask(lines)

  const assurance = sectionDetails(content, 'Assurance')
  if (assurance.duplicate) errors.push(diagnostic('HARDENED_SECTION_DUPLICATE', 'tasks.md', duplicateHeadingLine(assurance), 'tasks.md has more than one exact ## Assurance heading'))

  const auditSection = sectionDetails(content, 'Negative-Space Readiness Audit')
  if (auditSection.duplicate) errors.push(diagnostic('HARDENED_SECTION_DUPLICATE', 'tasks.md', duplicateHeadingLine(auditSection), 'tasks.md has more than one exact ## Negative-Space Readiness Audit heading'))
  if (!auditSection.found) {
    errors.push(diagnostic('HARDENED_AUDIT_MISSING', 'tasks.md', 1, 'tasks.md is missing the ## Negative-Space Readiness Audit section'))
  } else {
    let structured = 0
    let index = auditSection.start + 1
    while (index < auditSection.end) {
      if (lineIsSkippable(lines[index], mask, index)) { index += 1; continue }
      const line = lines[index]
      const entry = line.match(/^- (N\S*) — (.+)$/u)
      const id = entry?.[1] ?? ''
      if (!entry || !HARDENED_ID.N.test(id) || !hardenedProse(entry[2])) {
        errors.push(diagnostic('HARDENED_AUDIT_ID_MALFORMED', 'tasks.md', index + 1, `'${line.trim()}' is not a valid '- N001 — prose' audit entry`))
        index += 1
        continue
      }
      const entryItem = { id, line: index + 1, disposition: null }
      index += 1
      let dispositionSeen = false
      let sawBlank = false
      while (index < auditSection.end) {
        if (mask[index] || /^\s*>/u.test(lines[index])) { index += 1; continue }
        const child = lines[index]
        if (child.trim() === '') { sawBlank = true; index += 1; continue }
        if (child.startsWith('- ')) break
        if (!child.startsWith('  - ')) { errors.push(diagnostic('HARDENED_AUDIT_DISPOSITION_INVALID', 'tasks.md', index + 1, `${id} has unexpected child line '${child.trim()}'`)); index += 1; continue }
        if (sawBlank && !dispositionSeen) { errors.push(diagnostic('HARDENED_AUDIT_DISPOSITION_INVALID', 'tasks.md', index + 1, `${id} has a blank line inside its entry`)); sawBlank = false }
        const field = child.match(/^  - Disposition: (.*)$/u)
        if (!field) { errors.push(diagnostic('HARDENED_AUDIT_DISPOSITION_INVALID', 'tasks.md', index + 1, `${id} has unexpected child line '${child.trim()}'`)); index += 1; continue }
        if (dispositionSeen) { errors.push(diagnostic('HARDENED_AUDIT_DISPOSITION_INVALID', 'tasks.md', index + 1, `${id} repeats its Disposition`)); index += 1; continue }
        dispositionSeen = true
        const value = field[1].trim()
        const covered = value.match(/^covered by (.+)$/u)
        const accepted = value.match(/^accepted limitation — (.+)$/u)
        if (covered && hardenedProse(covered[1])) {
          const ids = parseIdList(covered[1].trim(), 'V')
          if (ids.error) errors.push(diagnostic('HARDENED_AUDIT_DISPOSITION_INVALID', 'tasks.md', index + 1, `${id} Disposition 'covered by' needs a valid V ID list (${ids.error})`))
          else entryItem.disposition = { kind: 'covered', ids: ids.ids }
        } else if (accepted && hardenedProse(accepted[1])) {
          entryItem.disposition = { kind: 'accepted', reason: accepted[1].trim() }
        } else {
          errors.push(diagnostic('HARDENED_AUDIT_DISPOSITION_INVALID', 'tasks.md', index + 1, `${id} Disposition is not 'covered by <V-id-list>' or 'accepted limitation — prose'`))
        }
        index += 1
      }
      if (!dispositionSeen) errors.push(diagnostic('HARDENED_AUDIT_DISPOSITION_INVALID', 'tasks.md', entryItem.line, `${id} is missing its Disposition child`))
      if (audit.some((existing) => existing.id === id)) errors.push(diagnostic('HARDENED_AUDIT_DUPLICATE', 'tasks.md', entryItem.line, `readiness defect ${id} is defined more than once`))
      else audit.push(entryItem)
      structured += 1
    }
    if (structured === 0) errors.push(diagnostic('HARDENED_AUDIT_MISSING', 'tasks.md', auditSection.start + 1, "the '## Negative-Space Readiness Audit' section has no structured N entry"))
  }

  const taskSection = sectionDetails(content, 'Tasks')
  if (taskSection.duplicate) errors.push(diagnostic('HARDENED_SECTION_DUPLICATE', 'tasks.md', duplicateHeadingLine(taskSection), 'tasks.md has more than one exact ## Tasks heading'))
  if (!taskSection.found) {
    errors.push(diagnostic('HARDENED_TASK_ID_MALFORMED', 'tasks.md', 1, 'tasks.md has no ## Tasks section'))
  } else {
    let index = taskSection.start + 1
    while (index < taskSection.end) {
      if (lineIsSkippable(lines[index], mask, index)) { index += 1; continue }
      const line = lines[index]
      const entry = line.match(/^- \[([ xX])\] (T\S*) — (.+)$/u)
      const id = entry?.[2] ?? ''
      if (!entry || !HARDENED_ID.T.test(id) || !hardenedProse(entry[3])) {
        errors.push(diagnostic('HARDENED_TASK_ID_MALFORMED', 'tasks.md', index + 1, `'${line.trim()}' is not a valid '- [ ] T001 — prose' task`))
        index += 1
        continue
      }
      const task = { id, complete: entry[1].toLowerCase() === 'x', line: index + 1, fields: new Map(), verifies: null, satisfies: null, depends: null, group: null, evidence: [] }
      index += 1
      const seen = []
      let evidenceMode = false
      let sawBlank = false
      let blankFlagged = false
      while (index < taskSection.end) {
        if (mask[index] || /^\s*>/u.test(lines[index])) { index += 1; continue }
        const child = lines[index]
        if (child.trim() === '') { sawBlank = true; index += 1; continue }
        if (/^-\s*\[/u.test(child) || child.startsWith('- ')) break
        if (sawBlank && !blankFlagged) {
          errors.push(diagnostic('HARDENED_TASK_FIELD_MISSING', 'tasks.md', index + 1, `${id} has a blank line inside its entry`))
          blankFlagged = true
        }
        const evidence = child.match(/^    - (.+)$/u)
        if (evidence) {
          const item = evidence[1].match(/^(V\S*): (.*)$/u)
          const itemValue = item ? item[2].trim() : ''
          if (!evidenceMode) {
            errors.push(diagnostic('HARDENED_TASK_EVIDENCE_INVALID', 'tasks.md', index + 1, `${id} has an evidence item outside its Evidence field`))
          } else if (!item || !HARDENED_ID.V.test(item[1]) || !(hardenedProse(itemValue) || itemValue === 'pending')) {
            errors.push(diagnostic('HARDENED_TASK_EVIDENCE_INVALID', 'tasks.md', index + 1, `${id} evidence '${evidence[1].trim()}' is not '<V-id>: prose'`))
          } else {
            task.evidence.push({ id: item[1], value: itemValue, line: index + 1 })
          }
          index += 1
          continue
        }
        const field = child.match(/^  - ([^:]+):(?: (.*))?$/u)
        if (!field) { errors.push(diagnostic('HARDENED_TASK_FIELD_MISSING', 'tasks.md', index + 1, `${id} has unexpected child line '${child.trim()}'`)); index += 1; continue }
        const label = field[1]
        const value = (field[2] ?? '').trim()
        if (!HARDENED_TASK_FIELDS.includes(label)) { errors.push(diagnostic('HARDENED_TASK_FIELD_MISSING', 'tasks.md', index + 1, `${id} has unknown field '${label}'`)); index += 1; continue }
        if (seen.includes(label)) { errors.push(diagnostic('HARDENED_TASK_FIELD_MISSING', 'tasks.md', index + 1, `${id} repeats field '${label}'`)); index += 1; continue }
        if (HARDENED_TASK_FIELDS.indexOf(label) !== seen.length) errors.push(diagnostic('HARDENED_TASK_FIELD_MISSING', 'tasks.md', index + 1, `${id} field '${label}' is out of order`))
        seen.push(label)
        if (label === 'Evidence') {
          evidenceMode = true
          index += 1
          continue
        }
        if (!hardenedProse(value)) { errors.push(diagnostic('HARDENED_TASK_FIELD_MISSING', 'tasks.md', index + 1, `${id} field '${label}' is empty or placeholder-only`)); index += 1; continue }
        task.fields.set(label, value)
        index += 1
      }
      for (const label of HARDENED_TASK_FIELDS) {
        if (!seen.includes(label)) errors.push(diagnostic('HARDENED_TASK_FIELD_MISSING', 'tasks.md', task.line, `${id} is missing required field '${label}'`))
      }
      if (task.fields.has('Satisfies')) {
        const satisfies = parseIdList(task.fields.get('Satisfies'), 'AC')
        if (satisfies.error) errors.push(diagnostic('HARDENED_TASK_FIELD_MISSING', 'tasks.md', task.line, `${id} Satisfies is not a valid AC ID list (${satisfies.error})`))
        else task.satisfies = satisfies.ids
      }
      if (task.fields.has('Verifies')) {
        const verifies = parseIdList(task.fields.get('Verifies'), 'V')
        if (verifies.error) errors.push(diagnostic('HARDENED_TASK_FIELD_MISSING', 'tasks.md', task.line, `${id} Verifies is not a valid V ID list (${verifies.error})`))
        else task.verifies = verifies.ids
      }
      if (task.fields.has('Depends on')) {
        const value = task.fields.get('Depends on')
        if (value === 'none') task.depends = 'none'
        else {
          const parts = value.split(', ')
          if (parts.some((part) => part === '' || !HARDENED_ID.T.test(part))) {
            errors.push(diagnostic('HARDENED_TASK_FIELD_MISSING', 'tasks.md', task.line, `${id} Depends on is not 'none' or a valid T ID list`))
          } else {
            task.depends = parts
          }
        }
      }
      if (task.fields.has('Cohesion group')) {
        const value = task.fields.get('Cohesion group')
        if (value === 'none') task.group = 'none'
        else if (HARDENED_ID.G.test(value)) task.group = value
        else errors.push(diagnostic('HARDENED_TASK_FIELD_MISSING', 'tasks.md', task.line, `${id} Cohesion group is not 'none' or a valid G ID`))
      }
      if (task.verifies) {
        const ids = task.evidence.map((item) => item.id)
        if (ids.length !== task.verifies.length || ids.some((value, position) => value !== task.verifies[position])) {
          errors.push(diagnostic('HARDENED_TASK_EVIDENCE_INVALID', 'tasks.md', task.line, `${id} evidence IDs ${JSON.stringify(ids)} must match Verifies ${JSON.stringify(task.verifies)} in order`))
        }
        if (task.complete && task.evidence.some((item) => item.value === 'pending')) {
          errors.push(diagnostic('HARDENED_TASK_EVIDENCE_PENDING', 'tasks.md', task.line, `${id} is checked but retains pending evidence`))
        }
      }
      if (tasks.has(id)) errors.push(diagnostic('HARDENED_TASK_DUPLICATE', 'tasks.md', task.line, `task ${id} is defined more than once`))
      else { tasks.set(id, task); rawTasks.push(task) }
    }
    if (tasks.size === 0) errors.push(diagnostic('HARDENED_TASK_ID_MALFORMED', 'tasks.md', taskSection.start + 1, 'the ## Tasks section has no valid task entry'))
  }

  if (errors.length === 0) {
    const taskOrder = rawTasks.map((task) => task.id)
    if (spec) {
      for (const task of rawTasks) {
        let undefinedReference = false
        if (task.verifies) {
          for (const vid of task.verifies) {
            if (!spec.vs.has(vid)) { errors.push(diagnostic('HARDENED_V_UNDEFINED', 'tasks.md', task.line, `${task.id} verifies undefined verification case ${vid}`)); undefinedReference = true }
          }
        }
        if (task.satisfies) {
          for (const ac of task.satisfies) {
            if (!spec.acs.has(ac)) { errors.push(diagnostic('HARDENED_AC_UNDEFINED', 'tasks.md', task.line, `${task.id} Satisfies references undefined acceptance criterion ${ac}`)); undefinedReference = true }
          }
        }
        if (!undefinedReference && task.verifies && task.satisfies) {
          const union = new Set()
          for (const vid of task.verifies) {
            const definition = spec.vs.get(vid)
            if (definition?.proves) for (const ac of definition.proves) union.add(ac)
          }
          const same = task.satisfies.length === union.size && task.satisfies.every((ac) => union.has(ac))
          if (!same) errors.push(diagnostic('HARDENED_TASK_AC_MISMATCH', 'tasks.md', task.line, `${task.id} Satisfies ${JSON.stringify(task.satisfies)} is not the AC union ${JSON.stringify([...union])} proved by Verifies`))
        }
      }
      for (const definition of spec.vs.values()) {
        if (!rawTasks.some((task) => task.verifies?.includes(definition.id))) errors.push(diagnostic('HARDENED_V_UNROUTED', 'tasks.md', definition.line, `verification case ${definition.id} has no task route`))
      }
      for (const item of audit) {
        if (item.disposition?.kind !== 'covered') continue
        for (const vid of item.disposition.ids) {
          if (!spec.vs.has(vid)) errors.push(diagnostic('HARDENED_V_UNDEFINED', 'tasks.md', item.line, `${item.id} disposition references undefined verification case ${vid}`))
        }
      }
    }
    for (const task of rawTasks) {
      if (task.group && task.group !== 'none' && groups && !groups.has(task.group)) {
        errors.push(diagnostic('HARDENED_GROUP_UNDEFINED', 'tasks.md', task.line, `${task.id} names undefined cohesion group ${task.group}`))
      }
      if (task.depends && task.depends !== 'none') {
        if (new Set(task.depends).size !== task.depends.length) errors.push(diagnostic('HARDENED_TASK_DEPENDENCY_INVALID', 'tasks.md', task.line, `${task.id} repeats a dependency`))
        for (const dependency of task.depends) {
          if (dependency === task.id) errors.push(diagnostic('HARDENED_TASK_DEPENDENCY_INVALID', 'tasks.md', task.line, `${task.id} cannot depend on itself`))
          else if (!taskOrder.includes(dependency)) errors.push(diagnostic('HARDENED_TASK_DEPENDENCY_INVALID', 'tasks.md', task.line, `${task.id} depends on undefined task ${dependency}`))
          else if (taskOrder.indexOf(dependency) >= taskOrder.indexOf(task.id)) errors.push(diagnostic('HARDENED_TASK_DEPENDENCY_INVALID', 'tasks.md', task.line, `${task.id} depends on ${dependency}, which is not earlier in the checklist`))
        }
      }
    }
    if (HARDENED_RESULT_ACTIVITIES.has(activity)) {
      const unchecked = rawTasks.filter((task) => !task.complete)
      if (unchecked.length) errors.push(diagnostic('HARDENED_TASK_INCOMPLETE', 'tasks.md', unchecked[0].line, `${unchecked.length} task(s) remain unchecked before ${activity}`))
    }
  }
  return { errors, tasks, rawTasks, audit }
}

const parseHardenedValidation = (content, spec) => {
  const errors = []
  const results = new Map()
  const rawResults = []
  const lines = content.split(/\r?\n/u)
  const mask = fencedLineMask(lines)
  const assurance = sectionDetails(content, 'Assurance')
  if (assurance.duplicate) errors.push(diagnostic('HARDENED_SECTION_DUPLICATE', 'validation.md', duplicateHeadingLine(assurance), 'validation.md has more than one exact ## Assurance heading'))
  const section = sectionDetails(content, 'Results')
  if (section.duplicate) errors.push(diagnostic('HARDENED_SECTION_DUPLICATE', 'validation.md', duplicateHeadingLine(section), 'validation.md has more than one exact ## Results heading'))
  const metadata = { candidate: null, context: null, summary: null }
  const metaLabels = ['Candidate', 'Validation context', 'Validation summary']
  const seenMeta = []

  if (section.found) {
    let index = section.start + 1
    let sawBlank = false
    let metaBlankFlagged = false
    while (index < section.end) {
      if (mask[index] || /^\s*>/u.test(lines[index])) { index += 1; continue }
      const line = lines[index]
      if (line.trim() === '') { sawBlank = true; index += 1; continue }
      if (line.startsWith('- ')) break
      if (line.startsWith('  - ')) { index += 1; continue }
      const match = line.match(/^(Candidate|Validation context|Validation summary):(?: (.*))?$/u)
      if (!match) { errors.push(diagnostic('HARDENED_VALIDATION_META_INVALID', 'validation.md', index + 1, `unexpected Results metadata line '${line.trim()}'`)); index += 1; continue }
      const label = match[1]
      const value = (match[2] ?? '').trim()
      if (seenMeta.includes(label)) { errors.push(diagnostic('HARDENED_VALIDATION_META_INVALID', 'validation.md', index + 1, `duplicate metadata '${label}'`)); index += 1; continue }
      if (sawBlank && seenMeta.length > 0 && !metaBlankFlagged) { errors.push(diagnostic('HARDENED_VALIDATION_META_INVALID', 'validation.md', index + 1, 'the Results metadata block has a blank line inside it')); metaBlankFlagged = true }
      sawBlank = false
      if (metaLabels.indexOf(label) !== seenMeta.length) errors.push(diagnostic('HARDENED_VALIDATION_META_INVALID', 'validation.md', index + 1, `metadata '${label}' is out of order`))
      seenMeta.push(label)
      if (!hardenedProse(value)) { errors.push(diagnostic('HARDENED_VALIDATION_META_INVALID', 'validation.md', index + 1, `metadata '${label}' is empty or placeholder-only`)); index += 1; continue }
      if (label === 'Validation context' && !HARDENED_CONTEXTS.includes(value)) { errors.push(diagnostic('HARDENED_VALIDATION_META_INVALID', 'validation.md', index + 1, `Validation context '${value}' is not one of ${HARDENED_CONTEXTS.join(', ')}`)); index += 1; continue }
      if (label === 'Validation summary' && !HARDENED_SUMMARIES.includes(value)) { errors.push(diagnostic('HARDENED_VALIDATION_META_INVALID', 'validation.md', index + 1, `Validation summary '${value}' is not one of ${HARDENED_SUMMARIES.join(', ')}`)); index += 1; continue }
      if (label === 'Candidate') metadata.candidate = value
      else if (label === 'Validation context') metadata.context = value
      else metadata.summary = value
      index += 1
    }
    for (const label of metaLabels) {
      if (!seenMeta.includes(label)) errors.push(diagnostic('HARDENED_VALIDATION_META_INVALID', 'validation.md', section.start + 1, `Results is missing '${label}'`))
    }

    while (index < section.end) {
      if (lineIsSkippable(lines[index], mask, index)) { index += 1; continue }
      const line = lines[index]
      const entry = line.match(/^- (V\S*) — (PASS|FAIL|BLOCKED|SKIPPED)$/u)
      const id = entry?.[1] ?? ''
      if (!entry || !HARDENED_ID.V.test(id)) {
        errors.push(diagnostic('HARDENED_RESULT_ID_MALFORMED', 'validation.md', index + 1, `'${line.trim()}' is not a valid '- V001 — PASS' result`))
        index += 1
        continue
      }
      const result = { id, status: entry[2], line: index + 1, fields: new Map(), proves: null, expected: null, oracle: null }
      index += 1
      const seen = []
      let sawFieldBlank = false
      let blankFlagged = false
      while (index < section.end) {
        if (mask[index] || /^\s*>/u.test(lines[index])) { index += 1; continue }
        const child = lines[index]
        if (child.trim() === '') { sawFieldBlank = true; index += 1; continue }
        if (child.startsWith('- ')) break
        if (!child.startsWith('  - ')) { errors.push(diagnostic('HARDENED_RESULT_FIELD_MISSING', 'validation.md', index + 1, `${id} has unexpected child line '${child.trim()}'`)); index += 1; continue }
        if (sawFieldBlank && !blankFlagged) { errors.push(diagnostic('HARDENED_RESULT_FIELD_MISSING', 'validation.md', index + 1, `${id} has a blank line inside its entry`)); blankFlagged = true }
        const field = child.match(/^  - ([^:]+):(?: (.*))?$/u)
        if (!field) { errors.push(diagnostic('HARDENED_RESULT_FIELD_MISSING', 'validation.md', index + 1, `${id} has unexpected child line '${child.trim()}'`)); index += 1; continue }
        const label = field[1]
        const value = (field[2] ?? '').trim()
        if (!HARDENED_RESULT_FIELDS.includes(label)) { errors.push(diagnostic('HARDENED_RESULT_FIELD_MISSING', 'validation.md', index + 1, `${id} has unknown field '${label}'`)); index += 1; continue }
        if (seen.includes(label)) { errors.push(diagnostic('HARDENED_RESULT_FIELD_MISSING', 'validation.md', index + 1, `${id} repeats field '${label}'`)); index += 1; continue }
        if (HARDENED_RESULT_FIELDS.indexOf(label) !== seen.length) errors.push(diagnostic('HARDENED_RESULT_FIELD_MISSING', 'validation.md', index + 1, `${id} field '${label}' is out of order`))
        seen.push(label)
        if (!hardenedProse(value)) { errors.push(diagnostic('HARDENED_RESULT_FIELD_MISSING', 'validation.md', index + 1, `${id} field '${label}' is empty or placeholder-only`)); index += 1; continue }
        result.fields.set(label, value)
        if (label === 'Proves') {
          const proves = parseIdList(value, 'AC')
          if (proves.error) errors.push(diagnostic('HARDENED_RESULT_FIELD_MISSING', 'validation.md', index + 1, `${id} Proves is not a valid AC ID list (${proves.error})`))
          else result.proves = proves.ids
        } else if (label === 'Expected') result.expected = value
        else if (label === 'Oracle matched') {
          if (!HARDENED_ORACLE_MATCHES.includes(value)) errors.push(diagnostic('HARDENED_RESULT_FIELD_MISSING', 'validation.md', index + 1, `${id} Oracle matched '${value}' is not one of ${HARDENED_ORACLE_MATCHES.join(', ')}`))
          else result.oracle = value
        }
        index += 1
      }
      for (const label of HARDENED_RESULT_FIELDS) {
        if (!seen.includes(label)) errors.push(diagnostic('HARDENED_RESULT_FIELD_MISSING', 'validation.md', result.line, `${id} is missing required field '${label}'`))
      }
      if (results.has(id)) errors.push(diagnostic('HARDENED_RESULT_DUPLICATE', 'validation.md', result.line, `result ${id} is recorded more than once`))
      else { results.set(id, result); rawResults.push(result) }
    }
  }

  if (errors.length === 0 && spec) {
    for (const result of rawResults) {
      if (!spec.vs.has(result.id)) { errors.push(diagnostic('HARDENED_RESULT_UNEXPECTED', 'validation.md', result.line, `result ${result.id} has no specification definition`)); continue }
      const definition = spec.vs.get(result.id)
      if (result.proves) {
        const undefinedAc = result.proves.find((ac) => !spec.acs.has(ac))
        if (undefinedAc) errors.push(diagnostic('HARDENED_AC_UNDEFINED', 'validation.md', result.line, `${result.id} Proves references undefined acceptance criterion ${undefinedAc}`))
        else if (definition.proves) {
          const same = result.proves.length === definition.proves.length && result.proves.every((ac) => definition.proves.includes(ac))
          if (!same) errors.push(diagnostic('HARDENED_RESULT_AC_MISMATCH', 'validation.md', result.line, `${result.id} Proves ${JSON.stringify(result.proves)} differs from the specification ${JSON.stringify(definition.proves)}`))
        }
      }
      if (result.expected && definition.expected && result.expected !== definition.expected) {
        errors.push(diagnostic('HARDENED_RESULT_EXPECTED_MISMATCH', 'validation.md', result.line, `${result.id} Expected text differs from the specification oracle`))
      }
      if (result.oracle) {
        const consistent = (result.status === 'PASS' && result.oracle === 'yes')
          || (result.status === 'FAIL' && result.oracle === 'no')
          || ((result.status === 'BLOCKED' || result.status === 'SKIPPED') && result.oracle === 'unknown')
        if (!consistent) errors.push(diagnostic('HARDENED_RESULT_ORACLE_MISMATCH', 'validation.md', result.line, `${result.id} status ${result.status} requires a different 'Oracle matched' value`))
      }
    }
    for (const definition of spec.vs.values()) {
      if (!results.has(definition.id)) errors.push(diagnostic('HARDENED_RESULT_MISSING', 'validation.md', 1, `verification case ${definition.id} has no validation result`))
    }
    if (errors.length === 0 && metadata.summary) {
      const statuses = rawResults.map((result) => result.status)
      const allPass = statuses.every((status) => status === 'PASS')
      const anyFail = statuses.some((status) => status === 'FAIL')
      const anyBlocked = statuses.some((status) => status === 'BLOCKED' || status === 'SKIPPED')
      const summaryOk = metadata.summary === 'PASS' ? allPass : metadata.summary === 'FAIL' ? anyFail : !anyFail && anyBlocked
      if (!summaryOk) errors.push(diagnostic('HARDENED_SUMMARY_MISMATCH', 'validation.md', section.start + 1, `Validation summary ${metadata.summary} does not match the result statuses ${JSON.stringify(statuses)}`))
      else if (!allPass) {
        const first = rawResults.find((result) => result.status !== 'PASS')
        errors.push(diagnostic('HARDENED_RESULT_NONPASSING', 'validation.md', first?.line ?? 1, `${first?.id ?? 'A result'} ${first?.status ?? 'FAIL'} makes the coherent result set nonpassing, so the hardened validation gate cannot pass`))
      }
    }
  }
  return { errors, results, rawResults, metadata }
}

const hardenedConsistency = (workDir, activity, reports) => {
  const errors = []
  const files = HARDENED_ACTIVITY_FILES[activity]
  if (!files) return { errors, profile: null }
  const contentFor = (artifact) => {
    const report = reports.find((entry) => entry.artifact === artifact)
    if (report) return report.errors.length ? null : report.content
    const probe = readWorkFile(workDir, artifact)
    return probe.error === null ? probe.content : null
  }
  const planContent = contentFor('plan.md')
  if (planContent === null) return { errors, profile: null }
  const planDeclarations = parseAssuranceDeclarations(planContent)
  for (const malformed of planDeclarations.malformed) {
    errors.push(diagnostic('ASSURANCE_PROFILE_MALFORMED', 'plan.md', malformed.line, `'${malformed.text}' is not exactly 'Assurance profile: standard' or 'Assurance profile: hardened'`))
  }
  if (planDeclarations.duplicates.length) errors.push(diagnostic('ASSURANCE_PROFILE_DUPLICATE', 'plan.md', planDeclarations.duplicates[1].line, "plan.md has more than one recognized 'Assurance profile' declaration"))
  const profile = planDeclarations.value
  const planDeclarationInvalid = planDeclarations.malformed.length > 0 || planDeclarations.duplicates.length > 0

  const repeatedDeclarations = () => {
    for (const artifact of files) {
      if (artifact === 'plan.md' || artifact === 'spec.md') continue
      const content = contentFor(artifact)
      if (content === null) continue
      const parsed = parseAssuranceDeclarations(content)
      const section = sectionDetails(content, 'Assurance')
      if (section.found && section.duplicate) errors.push(diagnostic('HARDENED_SECTION_DUPLICATE', artifact, duplicateHeadingLine(section), `${artifact} has more than one exact ## Assurance heading`))
      for (const malformed of parsed.malformed) errors.push(diagnostic('ASSURANCE_PROFILE_MALFORMED', artifact, malformed.line, `'${malformed.text}' is not exactly 'Assurance profile: standard' or 'Assurance profile: hardened'`))
      if (parsed.duplicates.length) errors.push(diagnostic('ASSURANCE_PROFILE_DUPLICATE', artifact, parsed.duplicates[1].line, `${artifact} has more than one recognized 'Assurance profile' declaration`))
      if (profile === 'hardened') {
        if (!planDeclarationInvalid && parsed.value === null && parsed.malformed.length === 0 && parsed.duplicates.length === 0) errors.push(diagnostic('ASSURANCE_PROFILE_MISSING', artifact, section.found ? section.start + 1 : 1, `hardened ${artifact} requires a repeated 'Assurance profile: hardened' declaration`))
        else if (!planDeclarationInvalid && parsed.value !== null && parsed.value !== 'hardened') errors.push(diagnostic('ASSURANCE_PROFILE_CONFLICT', artifact, parsed.declaration.line, `repeated declaration '${parsed.value}' differs from the plan declaration 'hardened'`))
      } else if (!planDeclarationInvalid && parsed.value !== null && parsed.value !== profile) {
        errors.push(diagnostic('ASSURANCE_PROFILE_CONFLICT', artifact, parsed.declaration.line, profile === null ? `'${parsed.value}' appears without an authoritative plan declaration` : `repeated declaration '${parsed.value}' differs from the plan declaration '${profile}'`))
      }
    }
  }

  if (profile === null) {
    repeatedDeclarations()
    return { errors, profile: null }
  }
  if (profile === 'standard') {
    repeatedDeclarations()
    return { errors, profile }
  }

  repeatedDeclarations()
  const planParsed = parseHardenedPlan(planContent)
  errors.push(...planParsed.errors)
  // A hardened-required artifact that cannot be resolved and is not already
  // reported by the structural channel fails closed with its production code
  // rather than silently dropping cross-checks.
  const contentOrEmpty = (artifact) => {
    if (!files.includes(artifact)) return null
    const content = contentFor(artifact)
    if (content !== null) return content
    const alreadyReported = reports.some((entry) => entry.artifact === artifact && entry.errors.length > 0)
    return alreadyReported ? null : ''
  }
  const specContent = contentOrEmpty('spec.md')
  const specParsed = specContent === null ? null : parseHardenedSpec(specContent)
  if (specParsed) errors.push(...specParsed.errors)
  const specClean = specParsed && specParsed.errors.length === 0 ? specParsed : null
  const groupsClean = planParsed.errors.length === 0 ? planParsed.groups : null
  const tasksContent = contentOrEmpty('tasks.md')
  if (tasksContent !== null) errors.push(...parseHardenedTasks(tasksContent, specClean, groupsClean, activity).errors)
  const validationContent = contentOrEmpty('validation.md')
  if (validationContent !== null) errors.push(...parseHardenedValidation(validationContent, specClean).errors)
  return { errors, profile }
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
  return `---\nwork_id: ${workId}\nrecord_format: normal\nnext_agent: none\nstatus: waiting\nclosure: full\n---\n\n# Next\n\n## Agreement\n\nThe invoking SDW workflow session owns this new work item within the user's request; no broader authority is recorded yet.\n\n## Next action\n\nRefine scope.md against the objective and the repository context, then save the record.\n\n## Waiting on\n\nThe invoking SDW workflow session continues this work item now.\n\n## Work context\n\nCreated from the objective by node .sdw/sdw.mjs start; records live in this work directory.\n`
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
  const closure = row?.record?.closure ?? 'full'
  if (format === 'normal' && CLOSURE_ACTIVITIES.has(activity) && closure !== 'full') {
    required = [...(CLOSURE_ACTIVITY_FILES[closure]?.[activity] ?? required)]
  }
  const reports = required.map((artifact) => inspectArtifact(workDir, artifact))
  const errors = [
    ...reports.flatMap((report) => report.errors),
    ...taskConsistency(reports),
    ...recordConsistency(reports),
    ...(CLOSURE_ACTIVITIES.has(activity) ? closureConsistency(reports) : []),
  ]
  let durability = null
  if (DURABILITY_ACTIVITIES.has(activity) && row?.detected === 'fixed' && row.record) {
    durability = durabilityAssessment(workDir, row.record)
    // A failing durability report carries the condition, evidence source,
    // owner, and next responsibility, not the condition alone.
    if (durability.conditions.length) errors.push(...durability.lines)
  }
  if (row && CLOSURE_ACTIVITIES.has(activity) && row.record?.status === 'complete' && format === 'normal') {
    const tasksReport = reports.find((report) => report.artifact === 'tasks.md')
    if (tasksReport && !tasksReport.errors.length) {
      const pending = taskDetails(tasksReport.content).entries.filter((entry) => !entry.complete).length
      if (pending) errors.push(`next.md: status is 'complete' but ${pending} task(s) remain unchecked; closure must be honest`)
    }
  }
  const assurance = format === 'compact' ? { errors: [], profile: null } : hardenedConsistency(workDir, activity, reports)
  errors.push(...assurance.errors)
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
  const assuranceNote = assurance.profile === 'hardened'
    ? `; ${HARDENED_STRUCTURAL_NOTE}`
    : assurance.profile === 'standard' ? '; assurance standard' : ''
  const durabilityNote = durability ? `; durability ${durability.state}` : ''
  return `Check passed for ${activity} (${format} records): ${reports.map((report) => report.artifact).join(', ')}${suffix}${nextNote}${assuranceNote}${durabilityNote}`
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

// Read-only Git probes for terminal-state reconciliation. These never fetch,
// mutate, or contact a remote; they inspect only local refs and ancestry.
const gitProbe = (workDir, args) => {
  try {
    return execFileSync('git', ['-C', workDir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch {
    return null
  }
}

const gitExit = (workDir, args) => {
  try {
    execFileSync('git', ['-C', workDir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return 0
  } catch (error) {
    return typeof error.status === 'number' ? error.status : null
  }
}

const defaultBranchRef = (workDir) => {
  const symbolic = gitProbe(workDir, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])
  if (symbolic && symbolic.startsWith('origin/')) return symbolic
  for (const candidate of ['origin/main', 'origin/master']) {
    if (gitExit(workDir, ['rev-parse', '--verify', '--quiet', `refs/remotes/${candidate}`]) === 0) return candidate
  }
  return null
}

const RECONCILE_DISCLAIMER = 'Local Git ancestry is local evidence only: it does not prove a remote PR merge or GitHub issue closure, and reconciliation grants no merge, closure, or publication authority.'

const reconciliationOutcome = (record, observed) => {
  if (!record) return 'no record'
  if (record.status === 'complete') return 'complete'
  if (record.status === 'abandoned') return 'abandoned'
  if (record.status === 'reconcile') return 'awaiting reconciliation'
  if (record.status === 'waiting') {
    if (observed === 'integrated') return 'awaiting reconciliation'
    if (observed === 'not-integrated') return 'externally blocked'
    return 'external state unknown'
  }
  return 'not applicable'
}

// A read-only reconciliation of the record against visible local Git state.
// It reports the observed condition, the evidence source, and the next
// responsibility; it never mutates records, branches, remotes, or issues, and
// it never converts local ancestry into a completion or authority claim.
const reconcileState = (workDir, record) => {
  const state = {
    observed: 'unknown',
    source: 'local Git ancestry',
    detail: '',
    outcome: reconciliationOutcome(record, 'unknown'),
    nextResponsibility: null,
  }
  if (record?.nextAgent && record.nextAgent !== 'none') state.nextResponsibility = record.nextAgent
  if (gitProbe(workDir, ['rev-parse', '--show-toplevel']) === null) {
    state.detail = 'no Git repository for WORK_DIR; external state is unknown'
    return state
  }
  const branch = gitProbe(workDir, ['branch', '--show-current']) || '(detached HEAD)'
  const remotes = gitProbe(workDir, ['remote']) ?? ''
  if (remotes.trim() === '') {
    state.detail = 'no remote configured; local branch state cannot prove a remote merge or issue closure'
    state.outcome = reconciliationOutcome(record, 'unknown')
    return state
  }
  const baseRef = defaultBranchRef(workDir)
  if (baseRef === null) {
    state.detail = 'no remote default branch resolved; remote state is unknown'
    state.outcome = reconciliationOutcome(record, 'unknown')
    return state
  }
  const baseName = baseRef.replace(/^[^/]+\//u, '')
  if (branch === baseName) {
    state.detail = `current checkout is the integration branch '${branch}'; local ancestry cannot identify this work item's candidate`
    state.outcome = reconciliationOutcome(record, 'unknown')
    return state
  }
  const ancestry = gitExit(workDir, ['merge-base', '--is-ancestor', 'HEAD', baseRef])
  if (ancestry === 0) {
    state.observed = 'integrated'
    state.source = `local Git ancestry vs ${baseRef}`
    state.detail = `HEAD is contained in ${baseRef}; the external action may have completed, so reconcile the record`
  } else if (ancestry === 1) {
    state.observed = 'not-integrated'
    state.source = `local Git ancestry vs ${baseRef}`
    state.detail = `HEAD is not contained in ${baseRef}; no local completion evidence`
  } else {
    state.detail = `could not determine ancestry against ${baseRef}; external state is unknown`
  }
  state.outcome = reconciliationOutcome(record, state.observed)
  if (!state.nextResponsibility && state.outcome === 'awaiting reconciliation') state.nextResponsibility = 'sdw.finalize'
  return state
}

const reconciliationReport = (workDir, parsed, condition) => {
  const state = reconcileState(workDir, parsed.record)
  const responsibility = state.nextResponsibility ?? (parsed.record?.nextAgent === 'none' ? 'none' : '(not recorded)')
  return [
    `Reconciliation: ${state.outcome}`,
    `External state: observed ${state.observed}; evidence source: ${state.source}${state.detail ? `; ${state.detail}` : ''}`,
    `External condition: ${condition || '(none recorded)'}`,
    `Next responsibility: ${responsibility}`,
    RECONCILE_DISCLAIMER,
  ]
}

// Durable-continuity assessment. It reads only the local Git index, refs, and
// objects: it never fetches, never mutates records, refs, or remotes, and it
// grants no commit, push, merge, closure, or publication authority. A work
// directory outside Git control is reported as unknown, never as durable or
// failed. The optional `branch`, `candidate`, and `durability` references carry
// the declared durable location; the helper resolves them rather than judging
// prose.
const DURABILITY_ACTIVITIES = new Set(['handoff', 'finalize', 'wrap'])
const DURABILITY_OWNER = 'the work-item owner session'

// Recorded references are authored frontmatter values. Reject values that Git
// could read as an option or that cannot be a real ref/object name, and pass the
// survivors behind `--end-of-options`/`--contains=`, so a crafted value can never
// change which object is inspected.
const safeRefToken = (value) => typeof value === 'string' && value.trim() !== '' && !value.startsWith('-') && !/[\s\0]/u.test(value)

const durabilityAssessment = (workDir, record) => {
  if (gitProbe(workDir, ['rev-parse', '--show-toplevel']) === null) {
    return {
      state: 'unknown',
      conditions: [],
      lines: [
        'Durability: unknown — no Git repository for WORK_DIR; durability is not assessable.',
        'Durability evidence: the work directory is outside Git control.',
      ],
    }
  }
  const root = gitProbe(workDir, ['rev-parse', '--show-toplevel'])
  const relative = path.relative(root, workDir).split(path.sep).join('/')
  const declared = typeof record?.durability === 'string' && record.durability.trim() !== ''
  const tracked = (gitProbe(workDir, ['ls-files', '--', '.']) ?? '').trim()
  const ignored = gitExit(workDir, ['check-ignore', '-q', '.']) === 0
  // A recorded branch may be local or fetched into any configured remote, not
  // only 'origin'; enumerate every configured remote's tracking refs.
  const remotes = (gitProbe(workDir, ['remote']) ?? '').split(/\s+/u).filter(Boolean)
  const conditions = []
  let resolved = null
  if (record?.branch) {
    const branch = record.branch
    if (!safeRefToken(branch)) {
      conditions.push(`the recorded branch '${branch}' is not a valid ref name; re-pin the reference`)
    } else {
      const local = gitExit(workDir, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]) === 0
      let remoteRef = null
      for (const name of remotes) {
        if (gitExit(workDir, ['show-ref', '--verify', '--quiet', `refs/remotes/${name}/${branch}`]) === 0) {
          remoteRef = `${name}/${branch}`
          break
        }
      }
      if (!local && remoteRef === null) {
        conditions.push(`the recorded branch '${branch}' is not present in this checkout; restore the branch or re-pin the reference`)
      } else {
        const ref = local ? branch : remoteRef
        // workDir may be the repository root, where the relative path is empty.
        const itemPath = relative ? `${relative}/next.md` : 'next.md'
        if (gitExit(workDir, ['cat-file', '-e', '--end-of-options', `${ref}:${itemPath}`]) === 0) {
          resolved = `the recorded branch '${branch}' contains this work item`
        } else {
          conditions.push(`the recorded branch '${branch}' does not contain this work item at ${itemPath}; it is absent from that checkout`)
        }
      }
    }
  }
  if (record?.candidate) {
    const candidate = record.candidate
    if (!safeRefToken(candidate)) {
      conditions.push(`the recorded candidate '${candidate}' is not a valid object name; re-pin the candidate`)
    } else if (gitExit(workDir, ['cat-file', '-e', '--end-of-options', `${candidate}^{commit}`]) !== 0) {
      conditions.push(`the recorded candidate '${candidate}' is not present in this repository; re-pin the candidate`)
    } else if ((gitProbe(workDir, ['for-each-ref', `--contains=${candidate}`, '--format=%(refname)', 'refs/heads', 'refs/remotes']) ?? '').trim() === '') {
      // Only branches and remote-tracking refs protect a candidate for
      // continuity; a tag alone is one cleanup away from loss.
      conditions.push(`the recorded candidate '${candidate}' is unreachable from every local branch and remote; it is one cleanup away from loss`)
    } else {
      resolved = resolved ?? `the recorded candidate '${candidate}' is reachable from a local or remote-tracking ref`
    }
  }
  // A resolving branch or reachable candidate reference makes the work item
  // durable even when this checkout's work directory is untracked, because the
  // durable copy exists on that ref; only an unresolved untracked directory
  // fails, and an explicit reason records the exception instead of hiding it.
  let declaredException = false
  if (tracked === '') {
    if (declared) declaredException = true
    else if (resolved === null) conditions.push(`the work directory is ${ignored ? 'gitignored' : 'untracked'} and would not survive a worktree removal or checkout switch; commit the records or record an explicit 'durability: <reason>' exception, or record a resolving 'branch'/'candidate' reference`)
  }
  const state = conditions.length ? 'not durable' : declaredException && resolved === null ? 'declared non-durable' : 'durable'
  let summary = `Durability: ${state}`
  if (state === 'declared non-durable') summary += ` — a recorded reason permits this non-durable record: '${record.durability}'`
  else if (state === 'durable' && tracked === '' && resolved) summary += ` — ${resolved}`
  const lines = [`${summary}.`]
  for (const condition of conditions) lines.push(`Durability condition: ${condition}.`)
  lines.push('Durability evidence: local Git index, refs, and objects.')
  if (conditions.length || declaredException) lines.push(`Durability owner: ${DURABILITY_OWNER}.`)
  if (conditions.length) lines.push('Durability next responsibility: commit the work directory or record a durability reason, and restore or re-pin the missing reference.')
  return { state, conditions, lines }
}

const waitingCondition = (content) => (meaningfulSection(content, 'Waiting on') ?? '').split(/\r?\n/u)[0]?.trim() ?? ''

const reconcile = (value) => {
  const workDir = resolveWorkDir(value)
  const nextProbe = readWorkFile(workDir, 'next.md')
  if (nextProbe.error !== null) {
    return [
      `Reconciliation for ${workDir}`,
      `Record status: (next.md ${nextProbe.error}); external state is unknown`,
      RECONCILE_DISCLAIMER,
      'Reconcile is read-only; it never modifies records or remote state.',
    ].join('\n')
  }
  const parsed = parseNextRecord(nextProbe.content, workDir)
  const statusLabel = parsed.record?.status ?? (parsed.detected === 'unstructured' ? '(unstructured next.md)' : '(unknown)')
  return [
    `Reconciliation for ${workDir}`,
    `Record status: ${statusLabel}`,
    ...reconciliationReport(workDir, parsed, waitingCondition(nextProbe.content)),
    'Reconcile is read-only; it never modifies records or remote state.',
  ].join('\n')
}

const resume = (value) => {
  const workDir = resolveWorkDir(value)
  const available = Object.keys(ARTIFACTS).filter((artifact) => {
    try { return fs.lstatSync(artifactPath(workDir, artifact)).isFile() } catch { return false }
  })
  const reports = available.map((artifact) => inspectArtifact(workDir, artifact))
  const tasksReport = reports.find((report) => report.artifact === 'tasks.md')
  const progress = tasksReport ? taskProgress(tasksReport.content) : null
  const inconsistencies = [...reports.flatMap((report) => report.errors), ...taskConsistency(reports), ...recordConsistency(reports)]
  const nextReport = reports.find((report) => report.artifact === 'next.md')
  const compact = nextReport !== undefined && parseNextRecord(nextReport.content, workDir).record?.format === 'compact'
  const assurance = compact ? { errors: [], profile: null } : hardenedConsistency(workDir, 'resume', reports)
  inconsistencies.push(...assurance.errors)
  const assuranceLine = compact
    ? 'assurance: compact records bypass assurance parsing'
    : assurance.profile === 'hardened'
      ? HARDENED_STRUCTURAL_NOTE
      : assurance.profile === 'standard' ? 'assurance standard' : 'assurance: no exact declaration; current structural checks only'

  let recordNote = '(no next.md record)'
  let promptNote = ''
  let reconciliationNote = ''
  let durabilityNote = ''
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
      reconciliationNote = reconciliationReport(workDir, parsed, waitingCondition(nextProbe.content)).join('\n')
      const durability = durabilityAssessment(workDir, record)
      durabilityNote = durability.lines.join('\n')
      for (const condition of durability.conditions) {
        inconsistencies.push(`next.md: ${condition} (owner: ${DURABILITY_OWNER})`)
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
    reconciliationNote,
    durabilityNote,
    `Artifacts: ${available.join(', ') || '(none)'}`,
    taskLine,
    assuranceLine,
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
  else if (command === 'reconcile' && args.length === 1) result = reconcile(args[0])
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
