import React, { FC, useContext } from 'react'
import { Footer } from '@openneuro/components'
import { version as openneuroVersion } from '../../../lerna.json'

const FooterContainer: FC = () => {
  return <Footer version={openneuroVersion} />
}

export default FooterContainer