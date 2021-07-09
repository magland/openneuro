import * as datalad from '../../datalad/snapshots.js'
import { dataset, analytics } from './dataset.js'
import { checkDatasetRead, checkDatasetWrite } from '../permissions.js'
import { readme } from './readme.js'
import { description } from './description.js'
import { summary } from './summary.js'
import { snapshotIssues } from './issues.js'
import { getFiles, filterFiles } from '../../datalad/files.js'
import DatasetModel from '../../models/dataset'
import { filterRemovedAnnexObjects } from '../utils/file.js'
import SnapshotModel from '../../models/snapshot'

export const snapshots = obj => {
  return datalad.getSnapshots(obj.id)
}

export const snapshot = (obj, { datasetId, tag }, context) => {
  return checkDatasetRead(datasetId, context.user, context.userInfo).then(
    () => {
      return datalad.getSnapshot(datasetId, tag).then(snapshot => ({
        ...snapshot,
        dataset: () => dataset(snapshot, { id: datasetId }, context),
        description: () => description(snapshot),
        readme: () => readme(snapshot),
        summary: () => summary({ id: datasetId, revision: snapshot.hexsha }),
        files: ({ prefix }) =>
          getFiles(datasetId, snapshot.hexsha)
            .then(filterFiles(prefix))
            .then(filterRemovedAnnexObjects(datasetId)),
      }))
    },
  )
}

export const participantCount = async (obj, { modality }) => {
  const queryHasSubjects = {
    'summary.subjects': {
      $exists: true,
    },
  }
  const matchQuery = modality
    ? {
        $and: [
          queryHasSubjects,
          {
            'summary.modalities.0': modality,
          },
        ],
      }
    : queryHasSubjects
  const aggregateResult = await DatasetModel.aggregate([
    {
      $match: {
        public: true,
      },
    },
    {
      $lookup: {
        from: 'snapshots',
        localField: 'id',
        foreignField: 'datasetId',
        as: 'snapshots',
      },
    },
    {
      $project: {
        id: '$id',
        hexsha: { $arrayElemAt: ['$snapshots.hexsha', -1] },
      },
    },
    {
      $lookup: {
        from: 'summaries',
        localField: 'hexsha',
        foreignField: 'id',
        as: 'summary',
      },
    },
    {
      $match: matchQuery,
    },
    {
      $group: {
        _id: null,
        participantCount: {
          $sum: { $size: { $arrayElemAt: ['$summary.subjects', 0] } },
        },
      },
    },
  ]).exec()
  if (Array.isArray(aggregateResult)) {
    if (aggregateResult.length) return aggregateResult[0].participantCount
    else return 0
  } else return null
}

const sortSnapshots = (a, b) =>
  new Date(b.created).getTime() - new Date(a.created).getTime()

export const latestSnapshot = (obj, _, context) => {
  return datalad.getSnapshots(obj.id).then(snapshots => {
    const sortedSnapshots = Array.prototype.sort.call(snapshots, sortSnapshots)
    return snapshot(
      obj,
      { datasetId: obj.id, tag: sortedSnapshots[0].tag },
      context,
    )
  })
}

/**
 * Tag the working tree for a dataset
 */
export const createSnapshot = (
  obj,
  { datasetId, tag, changes },
  { user, userInfo },
) => {
  return checkDatasetWrite(datasetId, user, userInfo).then(async () => {
    return datalad.createSnapshot(datasetId, tag, userInfo, {}, changes)
  })
}

/**
 * Remove a tag from a dataset
 */
export const deleteSnapshot = (obj, { datasetId, tag }, { user, userInfo }) => {
  return checkDatasetWrite(datasetId, user, userInfo).then(() => {
    return datalad.deleteSnapshot(datasetId, tag)
  })
}

const Snapshot = {
  analytics: snapshot => analytics(snapshot),
  issues: snapshot => snapshotIssues(snapshot),
}

export default Snapshot
