import avatars1 from '@/images/avatars/Image-1.png'
import avatars2 from '@/images/avatars/Image-2.png'
import avatars3 from '@/images/avatars/Image-3.png'
import avatars4 from '@/images/avatars/Image-4.png'
import avatars5 from '@/images/avatars/Image-5.png'
import avatars6 from '@/images/avatars/Image-6.png'
import avatars7 from '@/images/avatars/Image-7.png'
import avatars8 from '@/images/avatars/Image-8.png'

export async function getAuthors() {
  return [
    {
      id: 1,
      displayName: 'Truelock',
      handle: 'truelock-alric',
      email: 'atruelock0@skype.com',
      gender: 'Bigender',
      avatarUrl: avatars1.src,
      bgImage: 'https://images.pexels.com/photos/4064835/pexels-photo-4064835.jpeg?auto=compress&cs=tinysrgb&w=500',
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
        'https://images.pexels.com/photos/5799379/pexels-photo-5799379.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
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
        'https://images.pexels.com/photos/1001990/pexels-photo-1001990.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
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
        'https://images.pexels.com/photos/2394446/pexels-photo-2394446.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
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
        'https://images.pexels.com/photos/3082150/pexels-photo-3082150.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
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
        'https://images.pexels.com/photos/5333590/pexels-photo-5333590.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
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
        'https://images.pexels.com/photos/4492596/pexels-photo-4492596.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
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
        'https://images.pexels.com/photos/5083491/pexels-photo-5083491.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
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
        'https://images.pexels.com/photos/3965509/pexels-photo-3965509.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
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
        'https://images.pexels.com/photos/5966631/pexels-photo-5966631.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
      starRating: 4.2,
      location: 'Ha Noi, Viet Nam',
      timeAsHost: {
        months: 2,
        years: 5,
      },
    },
  ]
}

export async function getAuthorByHandle(handle: string): Promise<THost> {
  const authors = await getAuthors()
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

export type TAuthor = Awaited<ReturnType<typeof getAuthors>>[number]
export type THost = TAuthor & {
  responseRate: number
  responseTime: string
  address: string
  phone: string
  languages: string
  joinedDate: string
  reviewsCount: number
  rating: number
  listingsCount: number
}
