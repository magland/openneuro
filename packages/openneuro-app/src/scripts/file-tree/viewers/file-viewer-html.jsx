import React from 'react'
import PropTypes from 'prop-types'

const FileViewerHtml = ({ data }) => {
  const decoder = new TextDecoder()
  return <iframe srcDoc={decoder.decode(data)} />
}

FileViewerHtml.propTypes = {
  data: PropTypes.instanceOf(ArrayBuffer),
}

export default FileViewerHtml
