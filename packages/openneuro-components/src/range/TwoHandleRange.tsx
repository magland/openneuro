// @ts-nocheck rc-slider types are broken (wrong types for Range)
import React from 'react'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'
import './range.scss'

export interface TwoHandleRangeProps {
  min: number
  max: number
  step: number
  dots: boolean
  pushable: boolean
  defaultValue: [number, number]
  marks: { number: string }
  newvalue: [number, number]
  setNewValue: (newvalue) => void
}
const Range = Slider.createSliderWithTooltip(Slider.Range)

export const TwoHandleRange: React.FC<TwoHandleRangeProps> = ({
  min,
  max,
  step,
  dots,
  pushable,
  defaultValue,
  marks,
  setNewValue,
  newvalue,
}) => {
  const noValue = JSON.stringify(newvalue) === JSON.stringify([null, null])
  return (
    <div className="formRange-inner">
      <Range
        min={min}
        max={max}
        step={step}
        dots={dots}
        pushable={pushable}
        defaultValue={defaultValue}
        onChange={value => setNewValue(value)}
        marks={marks}
        value={newvalue}
      />
      <label>
        {noValue ? 0 : newvalue[0]} &mdash; {noValue ? 0 : newvalue[1]}
      </label>
    </div>
  )
}