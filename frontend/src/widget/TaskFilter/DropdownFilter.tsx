import iconArrow from '@/shared/assets/icons/arrow-small.svg'
import { useState } from 'react'
import {
  FilterButton,
  FilterIcon,
  DropdownList,
  DropdownItem,
} from './TaskFilter.styles'
import { useClickOutside } from '@/shared/hook/useClickOutside'
import type { IFilterKey, ITaskFilterObj } from '@/entities/task/types'

export type DropdownId = Extract<
  ITaskFilterObj[keyof ITaskFilterObj],
  { type: 'dropdown' }
>['id']

type DropdownFilterProps = {
  filter: { id: DropdownId; label: string }
  avaliableValues: Array<{ id: string; label: string }>
  selectedValues: string[]
  onFilterChange: (filterId: IFilterKey, valueId: string) => void
}

export function DropdownFilter({
  filter,
  avaliableValues,
  selectedValues,
  onFilterChange,
}: DropdownFilterProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const wrapperRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false))

  const toggleDropdown = () => setIsOpen((prev) => !prev)

  return (
    <div ref={wrapperRef}>
      <FilterButton
        isActive={selectedValues.length > 0}
        onClick={() => toggleDropdown()}
      >
        {filter.label}
        <FilterIcon
          isOpen={isOpen}
          iconUrl={iconArrow}
          iconAlt="раскрыть/свернуть"
        />
      </FilterButton>
      {isOpen && (
        <DropdownList>
          {avaliableValues.map((value) => (
            <DropdownItem
              isActive={selectedValues.includes(value.id)}
              key={value.id}
              onClick={() => onFilterChange(filter.id, value.id)}
            >
              {value.label}
            </DropdownItem>
          ))}
        </DropdownList>
      )}
    </div>
  )
}
