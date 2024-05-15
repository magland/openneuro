import {
  GitAnnexAttributes,
  GitAnnexBackend,
  matchGitAttributes,
  parseGitAttributes,
} from "../gitattributes.ts"
import { dirname, git, join, STAGE, TREE } from "../deps.ts"
import { logger, setupLogging } from "../logger.ts"
import { PromiseQueue } from "./queue.ts"
import { checkKey, storeKey } from "./transferKey.ts"
import { ProgressBar } from "../deps.ts"
import { annexAdd, hashDirLower, readAnnexPath } from "./annex.ts"
import { GitWorkerContext, GitWorkerEventAdd } from "./types/git-context.ts"

let context: GitWorkerContext
let attributesCache: GitAnnexAttributes

/**
 * Paths to upload to the remote annex
 *
 * Keys are the annex key
 * Values are repo relative path
 */
const annexKeys: Record<string, string> = {}

async function done() {
  logger.info("Git worker shutdown.")
  // @ts-ignore
  await globalThis.postMessage({
    command: "closed",
  })
  await globalThis.close()
}

/**
 * Clone or fetch the draft
 */
async function update() {
  try {
    await context.fs.promises.access(join(context.repoPath, ".git"))
    logger.info(
      `Fetching ${context.datasetId} draft from "${context.repoEndpoint}"`,
    )
    await git.fetch(context.config())
  } catch (_err) {
    logger.info(
      `Cloning ${context.datasetId} draft from "${context.repoEndpoint}"`,
    )
    await git.clone(context.config())
    await git.fetch({ ...context.config(), ref: "git-annex" })
    try {
      await git.branch({
        ...context.config(),
        object: "origin/git-annex",
        ref: "git-annex",
      })
    } catch (_err) {
      logger.info(`git-annex branch creation skipped, already present`)
    }
  }
  logger.info(`${context.datasetId} draft fetched!`)
}

/**
 * Load or return a cache copy of .gitattributes
 */
async function getGitAttributes(): Promise<GitAnnexAttributes> {
  if (!attributesCache) {
    const options = context.config()
    try {
      const oid = await git.resolveRef({ ...options, ref: "main" }) ||
        await git.resolveRef({ ...options, ref: "master" })
      const rawAttributes = await git.readBlob({
        ...options,
        oid,
        filepath: ".gitattributes",
      })
      const stringAttributes = new TextDecoder().decode(rawAttributes.blob)
      attributesCache = parseGitAttributes(stringAttributes)
    } catch (_err) {
      logger.error(
        "Dataset repository is missing .gitattributes and may be improperly initialized.",
      )
      await done()
    }
  }
  return attributesCache
}

/**
 * Decide if this incoming file is annexed or not
 */
async function shouldBeAnnexed(
  relativePath: string,
  size: number,
): Promise<GitAnnexBackend> {
  const gitAttributes = await getGitAttributes()
  const attributes = matchGitAttributes(gitAttributes, relativePath)
  if (attributes.largefiles) {
    if (size > attributes.largefiles && attributes.backend) {
      return attributes.backend
    } else {
      return "GIT"
    }
  }
  // No rules matched, default to annex
  return "SHA256E"
}

/**
 * git-annex add equivalent
 */
async function add(event: GitWorkerEventAdd) {
  const { size } = await context.fs.promises.stat(event.data.path)
  const annexed = await shouldBeAnnexed(
    event.data.relativePath,
    size,
  )
  if (annexed === "GIT") {
    // Simple add case
    const options = {
      ...context.config(),
      filepath: event.data.relativePath,
    }
    const targetPath = join(context.repoPath, event.data.relativePath)
    // Verify parent directories exist
    await context.fs.promises.mkdir(dirname(targetPath), { recursive: true })
    // Copy non-annexed files for git index creation
    await context.fs.promises.copyFile(event.data.path, targetPath)
    await git.add(options)
    logger.info(`Add\t${event.data.relativePath}`)
  } else {
    if (
      await annexAdd(
        annexKeys,
        annexed,
        event.data.path,
        event.data.relativePath,
        size,
        context,
      )
    ) {
      logger.info(`Annexed\t${event.data.relativePath}`)
    } else {
      logger.info(`Unchanged\t${event.data.relativePath}`)
    }
  }
}

/**
 * Generate one commit for all pending git-annex branch changes
 */
async function commitAnnexBranch(annexKeys: Record<string, string>) {
  // Find the UUID of this repository if it exists already
  const expectedRemote = "OpenNeuro" // TODO - This could be more flexible?
  let uuid
  const uuidLog = await readAnnexPath("uuid.log", context)
  try {
    await git.checkout({
      ...context.config(),
      ref: "git-annex",
    })
    for (const line of uuidLog.split(/\n/)) {
      if (line.includes(expectedRemote)) {
        const endUuid = line.indexOf(" ")
        uuid = line.slice(0, endUuid)
      }
    }
    if (uuid) {
      for (const [key, _path] of Object.entries(annexKeys)) {
        const hashDir = join(...await hashDirLower(key))
        const annexBranchPath = join(hashDir, key)
        let log
        try {
          log = await readAnnexPath(annexBranchPath, context)
        } catch (err) {
          if (err.name === "NotFoundError") {
            logger.debug(`Annex branch object "${annexBranchPath}" not found`)
          } else {
            throw err
          }
        }
        if (log && log.includes(uuid)) {
          continue
        } else {
          const timestamp = performance.timeOrigin + performance.now()
          const newAnnexLog = `${timestamp}s 1 ${uuid}\n${log ? log : ""}`
          await context.fs.promises.mkdir(join(context.repoPath, hashDir), {
            recursive: true,
          })
          await context.fs.promises.writeFile(
            join(context.repoPath, annexBranchPath),
            newAnnexLog,
          )
          await git.add({ ...context.config(), filepath: annexBranchPath })
        }
      }
      await git.commit({
        ...context.config(),
        message: "[OpenNeuro CLI] Added annexed objects",
        author: context.author,
      })
    }
  } finally {
    try {
      // Try main first
      await git.checkout({
        ...context.config(),
        ref: "main",
      })
    } catch (err) {
      // Fallback to master and error if neither exists
      await git.checkout({
        ...context.config(),
        ref: "master",
      })
    }
  }
}

/**
 * `git commit` equivalent
 */
async function commit() {
  const options = context.config()
  let generateCommit = false
  let changes = 0
  const tree = await git.walk({
    ...options,
    trees: [TREE({ ref: "HEAD" }), STAGE()],
    map: async function (filepath, [A, B]) {
      if (await A?.type() === "blob" || await B?.type() === "blob") {
        const Aoid = await A?.oid()
        const Boid = await B?.oid()
        let type = "equal"
        if (Aoid !== Boid && Aoid !== undefined && Boid !== undefined) {
          logger.info(`modified:\t${filepath}`)
          type = "modify"
        }
        if (Aoid === undefined) {
          logger.info(`new file:\t${filepath}`)
          type = "add"
        }
        if (Boid === undefined) {
          logger.info(`deleted:\t${filepath}`)
          type = "remove"
        }
        if (type !== "equal") {
          generateCommit = true
          changes += 1
        }
      }
    },
  })
  if (generateCommit) {
    console.log(
      `Detected ${changes} change${changes === 1 ? "" : "s"}.`,
    )
    const commitHash = await git.commit({
      ...options,
      author: context.author,
      message: "[OpenNeuro] Added local files",
    })
    await commitAnnexBranch(annexKeys)
    logger.info(`Committed as "${commitHash}"`)
  } else {
    console.log("No changes found, not uploading.")
    workQueue.enqueue(done)
  }
}

/**
 * `git push` and `git-annex copy --to=openneuro`
 */
async function push() {
  let completed = 0
  const annexedObjects = Object.keys(annexKeys).length
  const progress = new ProgressBar({
    title: `Transferring annexed files`,
    total: annexedObjects,
  })
  if (annexedObjects > 0) {
    await progress.render(completed)
  }
  // Git-annex copy --to=openneuro
  for (const [key, path] of Object.entries(annexKeys)) {
    const checkKeyResult = await checkKey({
      url: context.repoEndpoint,
      token: context.authorization,
    }, key)
    if (checkKeyResult) {
      logger.info(`Skipping key "${key}" present on remote`)
    } else {
      let storeKeyResult = -1
      let retries = 3
      while (storeKeyResult === -1 && retries > 0) {
        retries -= 1
        storeKeyResult = await storeKey(
          {
            url: context.repoEndpoint,
            token: context.authorization,
          },
          key,
          path,
        )
        if (storeKeyResult === -1 && retries > 0) {
          logger.warn(`Failed to transfer annex object "${key}" - retrying`)
        }
      }
      if (storeKeyResult === -1) {
        logger.error(
          `Failed to transfer annex object "${key}" after ${retries} attempts`,
        )
      } else {
        completed += 1
        await progress.render(completed)
        logger.info(
          `Stored ${storeKeyResult} bytes for key "${key}" from path "${path}"`,
        )
      }
    }
  }
  console.log("Pushing changes...")
  // Git push
  await git.push(
    context.config(),
  )
  // Git push git-annex
  await git.push(
    { ...context.config(), ref: "git-annex" },
  )
  const url = new URL(context.repoEndpoint)
  console.log(
    `Upload complete, visit your dataset at ${url.protocol}//${url.host}/datasets/${context.datasetId}`,
  )
}

// Queue of tasks to perform in order
const workQueue = new PromiseQueue()

// @ts-ignore Expected for workers
self.onmessage = (event: GitWorkerEvent) => {
  if (event.data.command === "setup") {
    context = new GitWorkerContext(
      event.data.datasetId,
      event.data.sourcePath,
      event.data.repoPath,
      event.data.repoEndpoint,
      event.data.authorization,
      event.data.name,
      event.data.email,
    )
    setupLogging(event.data.logLevel)
  } else if (event.data.command === "clone") {
    workQueue.enqueue(update)
  } else if (event.data.command === "add") {
    workQueue.enqueue(add, event)
  } else if (event.data.command === "commit") {
    workQueue.enqueue(commit)
  } else if (event.data.command === "push") {
    workQueue.enqueue(push)
  } else if (event.data.command === "done") {
    workQueue.enqueue(done)
  }
}
