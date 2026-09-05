import CardCategoryBox1 from '@/components/cards/card-category-box1'
import CardCategory1 from '@/components/cards/card-category1'
import CardCategory3 from '@/components/cards/card-category3'
import CardCategory4 from '@/components/cards/card-category4'
import CardCategory5 from '@/components/cards/card-category5'
import CardCategory6 from '@/components/cards/card-category6'
import CardCategory7 from '@/components/cards/card-category7'
import CardCategory8 from '@/components/cards/card-category8'
import type { Category } from '@/types/content'

interface SectionGridCategoryBoxProps {
  categories: Category[]
  className?: string
  card?: 'box1' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
}

export default function SectionGridCategoryBox({ categories, className = '', card = 'box1' }: SectionGridCategoryBoxProps) {
  const renderCard = (category: Category) => {
    switch (card) {
      case 'box1':
        return <CardCategoryBox1 key={category.id} category={category} />
      case '1':
        return <CardCategory1 key={category.id} category={category} />
      // There is no CardCategory2; '2' has always rendered card 3.
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
