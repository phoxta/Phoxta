import CardAuthorBox from '@/components/cards/card-author-box'
import CardAuthorBox2 from '@/components/cards/card-author-box2'
import type { Author } from '@/types/content'
import clsx from 'clsx'

interface Props {
  className?: string
  authors: Author[]
  boxCard?: 'box1' | 'box2'
  gridClassName?: string
}

// The default gridClassName keeps its trailing space: clsx passes it through and
// the rendered class attribute must match the original byte-for-byte.
export default function SectionGridAuthorBox({
  className,
  authors,
  boxCard = 'box1',
  gridClassName = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ',
}: Props) {
  return (
    <div className={clsx(className, 'relative')}>
      <div className={clsx(gridClassName, 'grid gap-5 xl:gap-7')}>
        {authors.map((author) =>
          boxCard === 'box2' ? (
            <CardAuthorBox2 key={author.id} author={author} />
          ) : (
            <CardAuthorBox key={author.id} author={author} />
          )
        )}
      </div>
    </div>
  )
}
