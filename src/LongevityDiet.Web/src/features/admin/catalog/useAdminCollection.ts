import { useEffect, useState } from 'react'
import type { FoodQuery, RecipeQuery } from '../../catalog/catalogApi'

export type Kind = 'food' | 'recipe'
export type Status = 'all' | 'active' | 'inactive'
export type Feature = 'all' | 'plant' | 'legume' | 'grain' | 'fish'

export function useAdminCollection(kind: Kind) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<Status>('all')
  const [feature, setFeature] = useState<Feature>('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(handle)
  }, [search])

  const updateSearch = (value: string) => { setSearch(value); setPage(1) }
  const updateCategory = (value: string) => { setCategory(value); setPage(1) }
  const updateStatus = (value: Status) => { setStatus(value); setPage(1) }
  const updateFeature = (value: Feature) => { setFeature(value); setPage(1) }
  const updateSortBy = (value: string) => { setSortBy(value); setPage(1) }
  const updateSortDirection = (value: 'asc' | 'desc') => { setSortDirection(value); setPage(1) }
  const updatePageSize = (value: number) => { setPageSize(value); setPage(1) }
  const reset = () => {
    setPage(1); setPageSize(20); setSearch(''); setDebouncedSearch('')
    setCategory(''); setStatus('all'); setFeature('all')
    setSortBy('name'); setSortDirection('asc')
  }

  const common = {
    page, pageSize, search: debouncedSearch.trim() || undefined,
    category: category.trim() || undefined,
    isActive: status === 'all' ? undefined : status === 'active',
    sortBy, sortDirection,
  }
  const options: FoodQuery | RecipeQuery = kind === 'food' ? {
    ...common,
    isPlantBased: feature === 'plant' ? true : undefined,
    isLegume: feature === 'legume' ? true : undefined,
    isWholeGrain: feature === 'grain' ? true : undefined,
    isFish: feature === 'fish' ? true : undefined,
  } : {
    ...common,
    isPlantForward: feature === 'plant' ? true : undefined,
    hasLegume: feature === 'legume' ? true : undefined,
    hasWholeGrain: feature === 'grain' ? true : undefined,
    hasFish: feature === 'fish' ? true : undefined,
  }
  return {
    page, pageSize, search, category, status, feature, sortBy, sortDirection,
    options, setPage, updatePageSize, updateSearch, updateCategory, updateStatus,
    updateFeature, updateSortBy, updateSortDirection, reset,
  }
}

export type CollectionQuery = ReturnType<typeof useAdminCollection>
