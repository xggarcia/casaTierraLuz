import { useState } from 'react'
import type { Course, Category } from '../../../domain/entities/Course'
import { CATEGORIES, CATEGORY_LABELS } from '../../../domain/entities/Course'
import { useLocale } from '../../hooks/useLocale'

interface Props {
  courses: Course[]
  onFilter: (filtered: Course[]) => void
}

export function CourseFilterBar({ courses, onFilter }: Props) {
  const { loc, language } = useLocale()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | ''>('')

  const apply = (q: string, cat: Category | '') => {
    const q2 = q.toLowerCase()
    onFilter(courses.filter(c => {
      const matchSearch = !q2 || loc(c.titulo).toLowerCase().includes(q2)
      const matchCat = !cat || c.tags.includes(cat)
      return matchSearch && matchCat
    }))
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    apply(e.target.value, category)
  }

  const handleCategory = (cat: Category | '') => {
    setCategory(cat)
    apply(search, cat)
  }

  return (
    <div className="course-filter-bar">
      <input
        className="course-filter-search"
        type="search"
        placeholder="Buscar curso…"
        value={search}
        onChange={handleSearch}
      />
      <div className="course-filter-cats">
        <button
          type="button"
          className={`course-filter-cat${category === '' ? ' active' : ''}`}
          onClick={() => handleCategory('')}
        >
          Todos
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            className={`course-filter-cat${category === cat ? ' active' : ''}`}
            onClick={() => handleCategory(cat)}
          >
            {CATEGORY_LABELS[language][cat]}
          </button>
        ))}
      </div>
    </div>
  )
}
