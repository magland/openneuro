import React from 'react'
import PropTypes from 'prop-types'
import gql from 'graphql-tag'
import { Mutation } from 'react-apollo'
import { convertToRaw } from 'draft-js'
import withProfile from '../../authentication/withProfile.js'
import { DATASET_COMMENTS } from '../dataset/dataset-query-fragments.js'

const NEW_COMMENT = gql`
  mutation addComment($datasetId: ID!, $parentId: ID, $comment: String!) {
    addComment(datasetId: $datasetId, parentId: $parentId, comment: $comment)
  }
`

const EDIT_COMMENT = gql`
  mutation editComment($datasetId: ID!, $commentId: ID, $comment: String!) {
    editComment(datasetId: $datasetId, commentId: $parentId, comment: $comment)
  }
`

export const appendCommentToTree = (tree, newComment) => {
  if (newComment.hasOwnProperty('parentId') && newComment.parentId) {
    const parentId = newComment.parentId
    for (const comment of tree) {
      if (comment.id === parentId) {
        // We might need to add a replies field
        if (comment.replies) {
          comment.replies = [newComment, ...comment.replies]
        } else {
          comment.replies = [newComment]
        }
      } else {
        // Iterate over this node's children
        if (comment.replies) {
          comment.replies = appendCommentToTree(comment.replies, newComment)
        } else {
          comment.replies = []
        }
      }
    }
    return tree
  } else {
    return [newComment, ...tree]
  }
}

const CommentMutation = ({
  datasetId,
  parentId,
  commentId,
  comment,
  disabled,
  profile,
}) => {
  return (
    <Mutation
      mutation={commentId ? EDIT_COMMENT : NEW_COMMENT}
      update={(cache, { data: { addComment } }) => {
        const datasetCacheId = `Dataset:${datasetId}`
        const { comments } = cache.readFragment({
          id: datasetCacheId,
          fragment: DATASET_COMMENTS,
        })
        // Create a mock comment
        const newComment = {
          id: addComment,
          parentId,
          text: JSON.stringify(convertToRaw(comment)),
          createDate: new Date().toISOString(),
          user: { __typename: 'User', ...profile },
          replies: [],
          __typename: 'Comment',
        }
        const newTree = appendCommentToTree(comments, newComment)
        cache.writeFragment({
          id: datasetCacheId,
          fragment: DATASET_COMMENTS,
          data: {
            __typename: 'Dataset',
            id: datasetId,
            comments: newTree,
          },
        })
      }}>
      {newComment => (
        <button
          className="btn-modal-action"
          disabled={disabled}
          onClick={() =>
            newComment({
              variables: {
                datasetId,
                parentId,
                commentId,
                comment: JSON.stringify(convertToRaw(comment)),
              },
            })
          }>
          Submit Comment
        </button>
      )}
    </Mutation>
  )
}

CommentMutation.propTypes = {
  datasetId: PropTypes.string,
  parentId: PropTypes.string,
  commentId: PropTypes.string,
  comment: PropTypes.object,
  disabled: PropTypes.bool,
  profile: PropTypes.object,
}

export default withProfile(CommentMutation)
