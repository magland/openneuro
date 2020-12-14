import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import DatasetHistory from '../fragments/dataset-history.jsx'
import CacheClear from '../mutations/cache-clear.jsx'

/**
 * Map dataset IDs to a normal distribution of backend workers
 * @param {string} dataset Accession number string - e.g. ds000001
 * @param {number} range Integer bound for offset from hash
 */
export function hashDatasetToRange(dataset, range) {
  const hash = crypto.createHash('sha1').update(dataset, 'utf8')
  const hexstring = hash.digest().toString('hex')
  return parseInt(hexstring.substring(32, 40), 16) % range
}

const AdminDataset = ({ dataset }) => (
  <div className="dataset-form">
    <div className="col-lg-12 dataset-form-header">
      <div className="form-group">
        <label>Admin</label>
      </div>
      <div className="col-lg-12">
        <p>
          Delete dataset cache drops all dataset caches (snapshot index,
          draft/snapshot file listings, current dataset description) and the
          cache is repopulated on the next API call.
        </p>
        <p>
          Reset draft head will move the draft to a given commit and rerun
          validation.
        </p>
      </div>
      <div className="col-lg-6">
        <h3>Draft Head</h3> {dataset.draft.head}
      </div>
      <DatasetHistory datasetId={dataset.id} />
      <hr />
      <div className="col-lg-12 dataset-form-controls">
        <div className="col-lg-12 modal-actions">
          <Link to={`/datasets/${dataset.id}`}>
            <button className="btn-admin-blue">Return to Dataset</button>
          </Link>
          <CacheClear datasetId={dataset.id} />
        </div>
      </div>
    </div>
  </div>
)

AdminDataset.propTypes = {
  dataset: PropTypes.object,
}

export default AdminDataset
