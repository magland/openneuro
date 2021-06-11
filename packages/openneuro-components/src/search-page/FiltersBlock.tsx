import React from 'react'
import { Button } from '../button/Button'
import { FilterListItem } from './FilterListItem'
import { FilterDateItem } from './FilterDateItem'
import { TermListItem } from './TermListItem'
import './filters-block.scss'

export interface FiltersBlockProps {
  keywords: string[]
  modality_selected?: { label: string; value: string }
  datasetType_selected?: string
  datasetStatus_selected?: { label: string; value: string }
  ageRange?: [number, number]
  subjectCountRange?: [number, number]
  authors: string[]
  gender_selected?: string
  tasks: string[]
  diagnosis_selected?: { label: string; value: string }
  section_selected?: { label: string; value: string }
  species_selected?: { label: string; value: string }
  studyDomain_selected?: { label: string; value: string }
  datePublicizedRange?: [Date | null, Date | null]
  removeFilterItem?(key: string, value): void
  removeAllFilters?(): void
}

export const FiltersBlock = ({
  keywords,
  modality_selected,
  datasetType_selected,
  datasetStatus_selected,
  ageRange,
  subjectCountRange,
  authors,
  gender_selected,
  tasks,
  diagnosis_selected,
  section_selected,
  species_selected,
  studyDomain_selected,
  datePublicizedRange,
  removeFilterItem,
  removeAllFilters,
}: FiltersBlockProps) => {
  const _listItem = (type, item) => {
    if (item === 'All') {
      return
    } else
      return (
        <>
          <li className={type}>
            <strong>{type}:</strong>
            <span>
              {type === 'Age' || type === 'Subjects'
                ? item[0] + ' - ' + item[1]
                : item}
              <span>&times;</span>
            </span>
          </li>
        </>
      )
  }
  const ageRangeIsNull =
    JSON.stringify(ageRange) === JSON.stringify([null, null])
  const subjectCountRangeIsNull =
    JSON.stringify(subjectCountRange) === JSON.stringify([null, null])

  const dateIsNull =
    JSON.stringify(datePublicizedRange) === JSON.stringify([null, null])

  return (
    <div className="filters-block">
      <h4>
        These filters return <span>100</span> results:{' '}
        <Button label="Clear All" size="small" onClick={removeAllFilters} />
      </h4>
      <ul className="active-filters">
        {keywords && (
          <TermListItem
            type="Keyword"
            item={{ param: 'keywords', values: keywords }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {modality_selected && (
          <FilterListItem
            type="Modality"
            item={{ param: 'modality_selected', value: modality_selected }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {datasetType_selected && (
          <FilterListItem
            type="Type"
            item={{
              param: 'datasetType_selected',
              value: datasetType_selected,
            }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {datasetStatus_selected && (
          <FilterListItem
            type="Status"
            item={{
              param: 'datasetStatus_selected',
              value: datasetStatus_selected,
            }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {!ageRangeIsNull && (
          <FilterListItem
            type="Age"
            item={{ param: 'ageRange', value: ageRange }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {!subjectCountRangeIsNull && (
          <FilterListItem
            type="Subjects"
            item={{ param: 'subjectCountRange', value: subjectCountRange }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {authors && (
          <TermListItem
            type="Authors/PI"
            item={{ param: 'authors', values: authors }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {gender_selected && (
          <FilterListItem
            type="Gender"
            item={{ param: 'gender_selected', value: gender_selected }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {tasks && (
          <TermListItem
            type="Task"
            item={{ param: 'tasks', values: tasks }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {diagnosis_selected && (
          <FilterListItem
            type="Diagnosis"
            item={{ param: 'diagnosis_selected', value: diagnosis_selected }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {section_selected && (
          <FilterListItem
            type="Section"
            item={{ param: 'section_selected', value: section_selected }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {species_selected && (
          <FilterListItem
            type="Species"
            item={{ param: 'species_selected', value: species_selected }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {studyDomain_selected && (
          <FilterListItem
            type="Domain"
            item={{
              param: 'studyDomain_selected',
              value: studyDomain_selected,
            }}
            removeFilterItem={removeFilterItem}
          />
        )}
        {!dateIsNull && (
          <FilterDateItem
            type="Date"
            item={{ param: 'datePublicizedRange', value: datePublicizedRange }}
            removeFilterItem={removeFilterItem}
          />
        )}
      </ul>
    </div>
  )
}
