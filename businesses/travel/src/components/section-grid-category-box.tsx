import CardCategoryBox1 from '@/components/card-category-box1'
import { TCategory } from '@/data/categories'
import React from 'react'
import CardCategory1 from './card-category1'
import CardCategory3 from './card-category3'
import CardCategory4 from './card-category4'
import CardCategory5 from './card-category5'
import CardCategory6 from './card-category6'
import CardCategory7 from './card-category7'
import CardCategory8 from './card-category8'

interface SectionGridCategoryBoxProps {
  categories: TCategory[]
  className?: string
  card?: 'box1' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
}

const SectionGridCategoryBox: React.FC<SectionGridCategoryBoxProps> = ({
  categories,
  className = '',
  card = 'box1',
}) => {
  const renderCard = (category: TCategory) => {
    switch (card) {
      case 'box1':
        return <CardCategoryBox1 key={category.id} category={category} />
      case '1':
        return <CardCategory1 key={category.id} category={category} />
      case '2':
        return <CardCategory3 key={category.id} category={category} />
      case '3':
        return <CardCategory3 key={category.id} category={category} />
      case '4':
        return <CardCategory4 key={category.id} category={category} />
      case '5':
        return <CardCategory5 key={category.id} category={category} />
      case '6':
        return <CardCategory6 key={category.id} category={category} />
      case '7':
        return <CardCategory7 key={category.id} category={category} />
      case '8':
        return <CardCategory8 key={category.id} category={category} />

      default:
        return <CardCategoryBox1 key={category.id} category={category} />
    }
  }

  return (
    <div className={`grid ${className} grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4`}>
      {categories.map(renderCard)}
    </div>
  )
}

export default SectionGridCategoryBox
