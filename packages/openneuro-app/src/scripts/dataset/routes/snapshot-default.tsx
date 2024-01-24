import React from "react"
import Markdown from "markdown-to-jsx"
import { ReadMore } from "@openneuro/components/read-more"
import { MetaDataBlock } from "../components/MetaDataBlock"
import Files from "../files/files"
import Comments from "../comments/comments"

/**
 * Default tab for snapshot pages
 */
export const SnapshotDefault = ({ dataset, snapshot }) => (
  <>
    <MetaDataBlock
      heading="README"
      item={
        <ReadMore id="readme" expandLabel="Read More" collapseLabel="Collapse">
          <Markdown options={{ disableParsingRawHTML: true }}>
            {snapshot.readme == null ? "N/A" : snapshot.readme}
          </Markdown>
        </ReadMore>
      }
      className="dataset-readme markdown-body"
    />
    <Files
      datasetId={dataset.id}
      snapshotTag={snapshot.tag}
      datasetName={snapshot.description.Name}
      files={snapshot.files}
      editMode={false}
      datasetPermissions={dataset.permissions}
      summary={snapshot?.summary}
    />
    <Comments
      datasetId={dataset.id}
      uploader={dataset.uploader}
      comments={dataset.comments}
    />
  </>
)
