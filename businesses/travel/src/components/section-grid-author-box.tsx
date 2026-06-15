import CardAuthorBox from '@/components/card-author-box'
import CardAuthorBox2 from '@/components/card-author-box2'
import { TAuthor } from '@/data/authors'
import clsx from 'clsx'
import { FC } from 'react'

interface Props {
  className?: string
  authors: TAuthor[]
  boxCard?: 'box1' | 'box2'
  gridClassName?: string
}

const SectionGridAuthorBox: FC<Props> = ({
  className,
  authors,
  boxCard = 'box1',
  gridClassName = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ',
}) => {
  return (
    <div className={clsx(className, 'relative')}>
      <div className={clsx(gridClassName, 'grid gap-5 xl:gap-7')}>
        {authors.map((author, index) =>
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

export default SectionGridAuthorBox
