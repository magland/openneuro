import React, { FC, useContext } from 'react'
import { SearchParamsCtx } from '../search-params-ctx'
import initialSearchParams from '../initial-search-params'
import { FacetRange } from '@openneuro/components'

const AgeRangeInput: FC = () => {
  const { searchParams, setSearchParams } = useContext(SearchParamsCtx)

  const ageRange = searchParams.ageRange
  const setAgeRange = ageRange =>
    setSearchParams(prevState => ({
      ...prevState,
      ageRange,
    }))

  const min = 0
  const max = 100
  const defaultValue =
    JSON.stringify(ageRange) === JSON.stringify(initialSearchParams.ageRange)
      ? [min, max]
      : ageRange

  return (
    <FacetRange
      startOpen={false}
      label="Age of Participants"
      accordionStyle="plain"
      min={min}
      max={max}
      step={10}
      defaultValue={defaultValue}
      onChange={setAgeRange}
    />
  )
}

export default AgeRangeInput
