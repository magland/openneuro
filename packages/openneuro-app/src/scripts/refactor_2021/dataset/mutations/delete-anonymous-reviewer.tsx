import React, { FC } from 'react'
import { gql, useMutation } from '@apollo/client'
import { WarnButton } from '@openneuro/components/warn-button'
import { DATASET_REVIEWERS } from '../fragments/dataset-reviewers'

const DELETE_REVIEWER = gql`
  mutation deleteReviewer($datasetId: ID!, $id: ID!) {
    deleteReviewer(datasetId: $datasetId, id: $id) {
      id
      datasetId
    }
  }
`

interface DeleteReviewerLinkProps {
  datasetId: string
  id: string
}

export const DeleteReviewerLink: FC<DeleteReviewerLinkProps> = ({
  datasetId,
  id,
}) => {
  const [DeleteReviewerLink] = useMutation(DELETE_REVIEWER, {
    update(cache, { data: { deleteReviewer } }) {
      const { reviewers } = cache.readFragment({
        id: `Dataset:${datasetId}`,
        fragment: DATASET_REVIEWERS,
      })
      const updatedReviewers = reviewers.filter(
        reviewer => reviewer.id !== deleteReviewer.id,
      )
      cache.writeFragment({
        id: `Dataset:${datasetId}`,
        fragment: DATASET_REVIEWERS,
        data: {
          __typename: 'Dataset',
          id: datasetId,
          reviewers: updatedReviewers,
        },
      })
    },
  })
  const [displayOptions, setDisplayOptions] = React.useState(false)
  return (
    <WarnButton
      message="Delete Reviewer Link"
      icon="fa-trash-o"
      displayOptions={displayOptions}
      setDisplayOptions={setDisplayOptions}
      withLabel={true}
      onConfirmedClick={() =>
        DeleteReviewerLink({ variables: { datasetId, id } })
      }
    />
  )
}
