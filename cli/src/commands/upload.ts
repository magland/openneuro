import { FetchHttpStack } from "../fetchHttpStack.ts"
import { validateCommand } from "./validate.ts"
import { ClientConfig, getConfig } from "./login.ts"
import { logger } from "../logger.ts"
import {
  Confirm,
  ProgressBar,
  relative,
  resolve,
  Tus,
  Uppy,
  walk,
} from "../deps.ts"
import type { CommandOptions } from "../deps.ts"

export function readConfig(): ClientConfig {
  const config = getConfig()
  logger.info(
    `configured with URL "${config.url}" and token "${
      config.token.slice(
        0,
        3,
      )
    }...${config.token.slice(-3)}`,
  )
  return config
}

export async function uploadAction(
  options: CommandOptions,
  dataset_directory: string,
) {
  const clientConfig = readConfig()
  const dataset_directory_abs = resolve(dataset_directory)
  logger.info(
    `upload ${dataset_directory} resolved to ${dataset_directory_abs}`,
  )

  // TODO - call the validator here

  let datasetId = "ds001001"
  if (options.dataset) {
    datasetId = options.dataset
  } else {
    if (!options.create) {
      const confirmation = await new Confirm(
        "Confirm creation of a new dataset?",
      )
      if (!confirmation) {
        console.log("Specify --dataset to upload to an existing dataset.")
        return
      }
    }
    // TODO Create dataset here
    datasetId = "ds001001"
  }
  // Setup upload
  const uppy = new Uppy({
    id: "@openneuro/cli",
    autoProceed: true,
    debug: true,
  }).use(Tus, {
    endpoint: "http://localhost:9876/tusd/files/",
    chunkSize: 64000000, // ~64MB
    uploadLengthDeferred: true,
    headers: {
      Authorization: `Bearer ${clientConfig.token}`,
    },
    httpStack: new FetchHttpStack(),
  })

  const progressBar = new ProgressBar({
    title: "Upload",
    total: 100,
  })
  progressBar.render(0)
  uppy.on("progress", (progress) => {
    progressBar.render(progress)
  })

  // Upload all files
  for await (
    const walkEntry of walk(dataset_directory, {
      includeDirs: false,
      includeSymlinks: false,
    })
  ) {
    const file = await Deno.open(walkEntry.path)
    const relativePath = relative(dataset_directory_abs, walkEntry.path)
    const uppyFile = {
      name: walkEntry.name,
      data: file.readable.getReader(),
      meta: {
        datasetId,
        relativePath,
      },
    }
    logger.debug(JSON.stringify({ name: uppyFile.name, meta: uppyFile.meta }))
    uppy.addFile(uppyFile)
  }
}

/**
 * Upload is validate extended with upload features
 */
export const upload = validateCommand
  .name("upload")
  .description("Upload a dataset to OpenNeuro")
  .option("--json", "Hidden for upload usage", { hidden: true, override: true })
  .option("--filenameMode", "Hidden for upload usage", {
    hidden: true,
    override: true,
  })
  .option("-d, --dataset", "Specify an existing dataset to update.", {
    conflicts: ["create"],
  })
  .option("-c, --create", "Skip confirmation to create a new dataset.", {
    conflicts: ["dataset"],
  })
  .action(uploadAction)
