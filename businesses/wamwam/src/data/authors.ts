import avatars1 from '@/assets/images/avatars/Image-1.png'
import avatars2 from '@/assets/images/avatars/Image-2.png'
import avatars3 from '@/assets/images/avatars/Image-3.png'
import avatars4 from '@/assets/images/avatars/Image-4.png'
import avatars5 from '@/assets/images/avatars/Image-5.png'
import avatars6 from '@/assets/images/avatars/Image-6.png'
import avatars7 from '@/assets/images/avatars/Image-7.png'
import avatars8 from '@/assets/images/avatars/Image-8.png'
import type { Author, AuthorDetail } from '@/types/content'

export function getAuthors(): Author[] {
  return [
    {
      id: 1,
      displayName: 'Truelock',
      handle: 'truelock-alric',
      email: 'atruelock0@skype.com',
      gender: 'Bigender',
      avatarUrl: avatars1.src,
      bgImage: '/images/catalog/4064835-500.webp',
      count: 40,
      description:
        'Superhosts are experienced, highly rated hosts who are committed to providing great stays for guests.',
      jobName: 'Manager',
      starRating: 4.9,
      location: 'London, UK',
      timeAsHost: {
        months: 2,
        years: 5,
      },
    },
    {
      id: 2,
      displayName: 'Chariot',
      handle: 'birrell-chariot',
      email: 'cbirrell1@google.com.hk',
      gender: 'Genderfluid',
      avatarUrl: avatars2.src,
      count: 113,
      description:
        'There’s no stopping the tech giant. Apple now opens its 100th store in China.There’s no stopping the tech giant.',
      jobName: 'Developer',
      bgImage:
        '/images/catalog/5799379-500.webp',
      starRating: 4.8,
      location: 'New York, USA',
      timeAsHost: {
        months: 2,
        years: 6,
      },
    },
    {
      id: 3,
      displayName: 'Nathanil',
      handle: 'foulcher-nathanil',
      email: 'nfoulcher2@google.com.br',
      gender: 'Bigender',
      avatarUrl: avatars3.src,
      count: 43,
      description:
        'There’s no stopping the tech giant. Apple now opens its 100th store in China.There’s no stopping the tech giant.',
      jobName: 'Writer',
      bgImage:
        '/images/catalog/1001990-500.webp',
      starRating: 4.7,
      location: 'New York, USA',
      timeAsHost: {
        months: 2,
        years: 3,
      },
    },
    {
      id: 4,
      displayName: 'Agnes',
      handle: 'falconar-agnes',
      email: 'afalconar3@google.ru',
      gender: 'Non-binary',
      avatarUrl: avatars4.src,
      count: 36,
      description:
        'There’s no stopping the tech giant. Apple now opens its 100th store in China.There’s no stopping the tech giant.',
      jobName: 'Editor',
      bgImage:
        '/images/catalog/2394446-500.webp',
      starRating: 4.6,
      location: 'Tokyo, Japan',
      timeAsHost: {
        months: 2,
        years: 5,
      },
    },
    {
      id: 5,
      displayName: 'Vita',
      handle: 'tousy-vita',
      email: 'vtousy4@elpais.com',
      gender: 'Male',
      avatarUrl: avatars5.src,
      count: 38,
      description:
        'There’s no stopping the tech giant. Apple now opens its 100th store in China.There’s no stopping the tech giant.',
      jobName: 'Designer',
      bgImage:
        '/images/catalog/3082150-500.webp',
      starRating: 4.5,
      location: 'Tokyo, Japan',
      timeAsHost: {
        months: 2,
        years: 4,
      },
    },
    {
      id: 6,
      displayName: 'Donna',
      handle: 'friar-donna',
      email: 'dfriar5@telegraph.co.uk',
      gender: 'Agender',
      avatarUrl: avatars6.src,
      count: 31,
      description:
        'There’s no stopping the tech giant. Apple now opens its 100th store in China.There’s no stopping the tech giant.',
      jobName: 'Designer',
      bgImage:
        '/images/catalog/5333590-500.webp',
      starRating: 4.4,
      location: 'London, UK',
      timeAsHost: {
        months: 2,
        years: 2,
      },
    },
    {
      id: 7,
      displayName: 'Sergei',
      handle: 'royal-sergei',
      email: 'sroyal6@netlog.com',
      gender: 'Non-binary',
      avatarUrl: avatars7.src,
      count: 102,
      description:
        'There’s no stopping the tech giant. Apple now opens its 100th store in China.There’s no stopping the tech giant.',
      jobName: 'CTO',
      bgImage:
        '/images/catalog/4492596-500.webp',
      starRating: 4.3,
      location: 'Paris, France',
      timeAsHost: {
        months: 2,
        years: 3,
      },
    },
    {
      id: 8,
      displayName: 'Claudetta',
      handle: 'sleite-claudetta',
      email: 'csleite7@godaddy.com',
      gender: 'Genderqueer',
      avatarUrl: avatars8.src,
      count: 35,
      description:
        'There’s no stopping the tech giant. Apple now opens its 100th store in China.There’s no stopping the tech giant.',
      jobName: 'Manager',
      bgImage:
        '/images/catalog/5083491-500.webp',
      starRating: 4.2,
      location: 'Paris, France',
      timeAsHost: {
        months: 2,
        years: 5,
      },
    },
    {
      id: 9,
      displayName: 'Vern',
      handle: 'pillifant-vern',
      email: 'vpillifant8@bravesites.com',
      gender: 'Male',
      avatarUrl: avatars1.src,
      count: 21,
      description:
        'There’s no stopping the tech giant. Apple now opens its 100th store in China.There’s no stopping the tech giant.',
      jobName: 'Manager',
      bgImage:
        '/images/catalog/3965509-500.webp',
      starRating: 4.2,
      location: 'Ha Noi, Viet Nam',
      timeAsHost: {
        months: 2,
        years: 7,
      },
    },
    {
      id: 10,
      displayName: 'Mimi',
      handle: 'fones-mimi',
      email: 'mfones9@canalblog.com',
      gender: 'Agender',
      avatarUrl: avatars2.src,
      count: 142,
      description:
        'There’s no stopping the tech giant. Apple now opens its 100th store in China.There’s no stopping the tech giant.',
      jobName: 'Designer',
      bgImage:
        '/images/catalog/5966631-500.webp',
      starRating: 4.2,
      location: 'Ha Noi, Viet Nam',
      timeAsHost: {
        months: 2,
        years: 5,
      },
    },
  ]
}

/** Host profile by handle. Falls back to the first author for an unknown handle (demo behaviour). */
export function getAuthorByHandle(handle: string): AuthorDetail {
  const authors = getAuthors()
  let author = authors.find((author) => author.handle === handle)
  if (!author?.id) {
    // return null

    // If no author found, return the first one
    // for demo purposes
    author = authors[0]
  }

  return {
    ...author,
    description: 'Providing lake views, The Symphony 9 Tam Coc in Ninh Binh provides accommodation, an outdoor.',
    address: 'Ha Noi, Viet Nam',
    phone: '+84 123 456 789',
    languages: 'English, Vietnamese',
    joinedDate: 'March 2016',
    reviewsCount: 120,
    rating: 4.9,
    listingsCount: 10,
    responseRate: 90,
    responseTime: 'Within an hour',
  }
}
