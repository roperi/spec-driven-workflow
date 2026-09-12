#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AGENTS, AGENT_FILES } from './agents.mjs'

const AGENT_NAME_PATTERN = /^sdw\.[a-z]+\.md$/u

const canonicalId = (source) => {
  const name = path.basename(source)
  if (!AGENT_NAME_PATTERN.test(name)) throw new Error(`canonical agent filename is invalid: ${name}`)
  const id = name.slice(0, -3)
  if (!Object.hasOwn(AGENTS, id)) throw new Error(`unsupported canonical agent: ${name}`)
  return id
}

const quoteYaml = (value) => `'${value.replaceAll("'", "''")}'`
const quoteToml = (value) => value.replaceAll('\\', '\\\\').replaceAll('"""', '\\"""')

const readCanonical = (source) => {
  const id = canonicalId(source)
  const body = fs.readFileSync(source, 'utf8').trim()
  if (!body) throw new Error(`canonical agent is empty: ${source}`)
  return { id, body, description: AGENTS[id].description }
}

const renderCodex = (source) => {
  const { id, body, description } = readCanonical(source)
  return `name = "${id}"\ndescription = ${quoteToml(description).includes('\\n') ? `"""${quoteToml(description)}"""` : `"${quoteToml(description)}"`}\ndeveloper_instructions = """\n${quoteToml(body)}\n"""\n`
}

const renderOpenCode = (source) => {
  const { body, description } = readCanonical(source)
  return `---\ndescription: ${quoteYaml(description)}\nmode: primary\n---\n\n${body}\n`
}

const renderDirectory = ({ tool, inputDir, outputDir }) => {
  if (!['codex', 'opencode'].includes(tool)) throw new Error(`unsupported renderer tool: ${tool}`)
  // Only the thirteen canonical sdw.* agent files are projected. Shared
  // instruction content such as agents/shared/workflow.md is never counted
  // or rendered as a native agent.
  const files = fs.readdirSync(inputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && AGENT_NAME_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort()
  if (files.length !== AGENT_FILES.length) {
    throw new Error(`expected ${AGENT_FILES.length} canonical agents in ${inputDir}, found ${files.length}`)
  }
  fs.mkdirSync(outputDir, { recursive: true })
  const rendered = []
  for (const name of files) {
    const source = path.join(inputDir, name)
    const id = canonicalId(source)
    const destination = path.join(outputDir, `${id}.${tool === 'codex' ? 'toml' : 'md'}`)
    const content = tool === 'codex' ? renderCodex(source) : renderOpenCode(source)
    fs.writeFileSync(destination, content, 'utf8')
    rendered.push(destination)
  }
  return rendered
}

const usage = () => `Usage: node runtime/render.mjs --tool codex|opencode --input-dir DIR --output-dir DIR`

const main = () => {
  const values = {}
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index]
    if (key === '--help' || key === '-h') {
      process.stdout.write(`${usage()}\n`)
      return
    }
    if (!['--tool', '--input-dir', '--output-dir'].includes(key) || !args[index + 1]) throw new Error(usage())
    values[key.slice(2)] = args[++index]
  }
  if (!values.tool || !values['input-dir'] || !values['output-dir']) throw new Error(usage())
  for (const destination of renderDirectory({ tool: values.tool, inputDir: values['input-dir'], outputDir: values['output-dir'] })) process.stdout.write(`${destination}\n`)
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    process.stderr.write(`render: ${error.message}\n`)
    process.exitCode = 1
  }
}

export { AGENTS, renderCodex, renderDirectory, renderOpenCode, readCanonical }
