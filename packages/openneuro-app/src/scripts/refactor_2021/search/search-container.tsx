import React, { FC, useContext, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  SearchPage,
  SearchResultsList,
} from '@openneuro/components/search-page'
import { Button } from '@openneuro/components/button'
import { Loading } from '@openneuro/components/loading'
import {
  KeywordInput,
  ModalitySelect,
  ShowDatasetRadios,
  AgeRangeInput,
  SubjectCountRangeInput,
  DiagnosisSelect,
  TaskInput,
  AuthorInput,
  GenderRadios,
  DateRadios,
  SpeciesSelect,
  SectionSelect,
  StudyDomainInput,
  BodyPartsInput,
  ScannerManufacturers,
  ScannerManufacturersModelNames,
  TracerNames,
  TracerRadionuclides,
  SortBySelect,
} from './inputs'
import FiltersBlockContainer from './filters-block-container'
import AggregateCountsContainer from '../aggregate-queries/aggregate-counts-container'
import { useCookies } from 'react-cookie'
import { getUnexpiredProfile } from '../authentication/profile'
import { useSearchResults } from './use-search-results'
import { SearchParamsCtx } from './search-params-ctx'
import { SearchParams } from './initial-search-params'
import Helmet from 'react-helmet'

export interface SearchContainerProps {
  portalContent?: Record<string, any>
}

/**
 * Setup default search parameters based on URL and other state
 */
export const setDefaultSearch = (
  modality: string,
  searchParams: Record<string, any>,
  setSearchParams: (newParams: Record<string, any>) => void,
  query: URLSearchParams,
): void => {
  if (query.has('mydatasets')) {
    setSearchParams(
      (prevState: SearchParams): SearchParams => ({
        ...prevState,
        datasetType_selected: 'My Datasets',
      }),
    )
  }
  if (query.has('bookmarks')) {
    setSearchParams(
      (prevState: SearchParams): SearchParams => ({
        ...prevState,
        datasetType_selected: 'My Bookmarks',
      }),
    )
  }

  const modalitiesWithSecondaries = {
    MRI: ['MRI', 'Diffusion', 'Structural', 'Functional', 'ASL Perfusion'],
    PET: ['PET', 'Static', 'Dynamic'],
    EEG: ['EEG'],
    iEEG: ['iEEG'],
    MEG: ['MEG'],
  }
  if (
    modality &&
    !modalitiesWithSecondaries[modality].includes(
      searchParams.modality_selected,
    )
  ) {
    setSearchParams(
      (prevState: SearchParams): SearchParams => ({
        ...prevState,
        modality_selected: modality,
      }),
    )
  }
}

const SearchContainer: FC<SearchContainerProps> = ({ portalContent }) => {
  const [cookies] = useCookies()
  const profile = getUnexpiredProfile(cookies)
  const location = useLocation()

  const { searchParams, setSearchParams } = useContext(SearchParamsCtx)
  const modality = portalContent?.modality || null
  useEffect(() => {
    setDefaultSearch(
      modality,
      searchParams,
      setSearchParams,
      new URLSearchParams(location.search),
    )
  }, [modality, searchParams.modality_selected, setSearchParams, location])

  const { loading, data, fetchMore, refetch, variables, error } =
    useSearchResults()
  const loadMore = loading
    ? () => {}
    : () => {
        fetchMore({
          variables: {
            // ...variables,
            cursor: data?.datasets?.pageInfo.endCursor,
          },
        })
      }

  let numTotalResults = 0
  let resultsList = []
  let hasNextPage = false
  if (data?.datasets) {
    const edges = data.datasets.edges.filter(edge => edge)
    numTotalResults = data.datasets.pageInfo.count
    resultsList = edges
    hasNextPage = data.datasets.pageInfo.hasNextPage
  }
  return (
    <>
      <Helmet>
        <title>OpenNeuro - {portalContent ? modality : ''} Search</title>
      </Helmet>
      <SearchPage
        portalContent={portalContent}
        renderAggregateCounts={() => (
          <AggregateCountsContainer modality={portalContent.modality} />
        )}
        renderFilterBlock={() => (
          <FiltersBlockContainer numTotalResults={numTotalResults} />
        )}
        renderSortBy={() => (
          <>
            {/* TODO: move wrapper div.col.search-sort into <SearchSort/> */}
            <div className="col search-sort">
              <SortBySelect />
            </div>
          </>
        )}
        renderSearchHeader={() => (
          <>
            {portalContent
              ? 'Search ' + modality + ' Portal'
              : 'Search All Datasets'}
          </>
        )}
        renderSearchFacets={() => (
          <>
            <KeywordInput />
            <ShowDatasetRadios />
            {!portalContent ? (
              <ModalitySelect portalStyles={true} label="Modalities" />
            ) : (
              <ModalitySelect portalStyles={false} label="Choose Modality" />
            )}
            <AgeRangeInput />
            <SubjectCountRangeInput />
            <DiagnosisSelect />
            <TaskInput />
            <AuthorInput />
            <GenderRadios />
            <DateRadios />
            <SpeciesSelect />
            <SectionSelect />
            <StudyDomainInput />
            {(portalContent === undefined ||
              portalContent?.modality === 'PET') && (
              <>
                <TracerNames />
              </>
            )}
            {portalContent?.modality === 'PET' && (
              <>
                <BodyPartsInput />
                <ScannerManufacturers />
                <ScannerManufacturersModelNames />
                <TracerRadionuclides />
              </>
            )}
          </>
        )}
        renderLoading={() =>
          loading ? (
            <div className="search-loading">
              <Loading />
            </div>
          ) : null
        }
        renderSearchResultsList={() =>
          numTotalResults === 0 ? (
            <h3>No results: please broaden your search.</h3>
          ) : (
            <>
              <SearchResultsList items={resultsList} profile={profile} />
              {/* TODO: make div below into display component. */}
              <div className="grid grid-nogutter" style={{ width: '100%' }}>
                {resultsList.length == 0 || !hasNextPage ? null : (
                  <div className="col col-12 load-more ">
                    <Button label="Load More" onClick={loadMore} />
                  </div>
                )}
              </div>
            </>
          )
        }
      />
    </>
  )
}

export default SearchContainer
