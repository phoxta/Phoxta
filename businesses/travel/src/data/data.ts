import avatarImage1 from '@/images/avatars/Image-1.png'
import avatarImage2 from '@/images/avatars/Image-2.png'
import avatarImage3 from '@/images/avatars/Image-3.png'
import avatarImage4 from '@/images/avatars/Image-4.png'
import { getLiveContent } from '@/data/live'
import {
  AccelerationIcon,
  AiGameIcon,
  AirplaneSeatIcon,
  AlarmSmokeIcon,
  Alien02Icon,
  AmpouleIcon,
  Astronaut01Icon,
  AutomotiveBattery01Icon,
  AutomotiveBattery02Icon,
  Beach02FreeIcons,
  Beach02Icon,
  BedSingle02Icon,
  Briefcase09Icon,
  CarParking01Icon,
  CheckmarkCircle02Icon,
  ChefHatIcon,
  City03Icon,
  ColorsIcon,
  DishWasherIcon,
  Dumbbell02Icon,
  EarthIcon,
  EquipmentGym03Icon,
  Fan01Icon,
  FireExtinguisherIcon,
  FirewallIcon,
  GolfCartIcon,
  HairClipsIcon,
  HairDryerFreeIcons,
  HairDryerIcon,
  HandSanitizerIcon,
  KitchenUtensilsIcon,
  LaptopIcon,
  MountainIcon,
  NoodlesIcon,
  PinLocation03Icon,
  PoolIcon,
  PoolTableIcon,
  RunningShoesIcon,
  ShoppingBag02Icon,
  SlowWindsIcon,
  StarCircleIcon,
  SteeringIcon,
  Time04Icon,
  Tv01Icon,
  UserMultipleIcon,
  WheelchairIcon,
  Wifi01Icon,
  WindTurbineIcon,
} from '@hugeicons/core-free-icons'
import { IconSvgElement } from '@hugeicons/react'

export function getListingReviews(handle: string) {
  const _live = getLiveContent('reviews'); if (_live) return _live as any
  return [
    {
      id: '1',
      title: "Can't say enough good things",
      rating: 5,
      content: 'Lovely hostess, very friendly! I would definitely stay here again. ',
      author: 'S. Walkinshaw',
      authorAvatar: avatarImage1,
      date: 'May 16, 2025',
      datetime: '2025-01-06',
    },
    {
      id: '2',
      title: 'Perfect for going out when you want to stay comfy',
      rating: 4,
      content: 'Excellent place. The host is super friendly, the room is clean and quiet.',
      author: 'Risako M',
      authorAvatar: avatarImage2,
      date: 'May 11, 2021',
      datetime: '2025-01-06',
    },
    {
      id: '3',
      title: 'Very nice feeling sweater!',
      rating: 5,
      content:
        'Very nice and friendly lady. Be pleasant to talk with her. The room looks better than in the pictures. ',
      author: 'Eden Birch',
      authorAvatar: avatarImage3,
      date: 'Aug 22, 2022',
      datetime: '2025-01-06',
    },
    {
      id: '4',
      title: 'Very nice feeling sweater!',
      rating: 5,
      content:
        'Lots of nice restaurants nearby and I tried two of them. I had so limited time in Paris this time and look forward to living here again.',
      author: 'Jonathan Edwards',
      authorAvatar: avatarImage3,
      date: 'May 16, 2025',
      datetime: '2025-01-06',
    },
    {
      id: '5',
      title: 'Very nice feeling sweater!',
      rating: 5,
      content:
        'Lots of nice restaurants nearby and I tried two of them. I had so limited time in Paris this time and look forward to living here again.',
      author: 'Edwards',
      authorAvatar: avatarImage2,
      date: 'May 16, 2025',
      datetime: '2025-01-06',
    },
    {
      id: '6',
      title: 'Very nice feeling sweater!',
      rating: 5,
      content:
        'Lots of nice restaurants nearby and I tried two of them. I had so limited time in Paris this time and look forward to living here again.',
      author: 'Jonathan',
      authorAvatar: avatarImage4,
      date: 'May 16, 2025',
      datetime: '2025-01-06',
    },
  ]
}
export function getBlogPosts() {
  const _live = getLiveContent('blog'); if (_live) return _live as any
  return [
    {
      id: '1',
      title: 'Soar Q4 2025 financial vacation rental results',
      handle: 'soar-q4-2025-financial-results',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.pexels.com/photos/412440/pexels-photo-412440.jpeg',
        alt: 'Soar Q4 2025 financial results',
        width: 3637,
        height: 2432,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '2 min read',
      author: {
        name: 'Scott Walkinshaw',
        avatar: {
          src: avatarImage1.src,
          alt: 'Scott Walkinshaw',
          width: avatarImage1.width,
          height: avatarImage1.height,
        },
        description:
          'Scott Walkinshaw is a fashion designer and stylist with over 10 years of experience in the industry. He specializes in creating unique and stylish outfits for special occasions.',
      },
    },
    {
      id: '2',
      title: 'Step inside the wild romance of “Wuthering Heights”',
      handle: 'step-inside-the-wild-romance-of-wuthering-heights',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.pexels.com/photos/35289079/pexels-photo-35289079.jpeg',
        alt: 'Step inside the wild romance of “Wuthering Heights”',
        width: 3637,
        height: 2432,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '3 min read',
      author: {
        name: 'Erica Alexander',
        avatar: {
          src: avatarImage2.src,
          alt: 'Erica Alexander',
          width: avatarImage2.width,
          height: avatarImage2.height,
        },
        description:
          'Erica Alexander is a fashion influencer and stylist with a passion for creating unique and stylish outfits. She has a keen eye for detail and loves to experiment with different styles and trends.',
      },
    },
    {
      id: '3',
      title: 'FIFA World Cup 2026™ travel trends, revealed',
      handle: 'fifa-world-cup-2026-travel-trends-revealed',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.pexels.com/photos/8828413/pexels-photo-8828413.jpeg',
        alt: 'FIFA World Cup 2026™ travel trends, revealed',
        width: 3637,
        height: 2432,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '3 min read',
      author: {
        name: 'Wellie Edwards',
        avatar: {
          src: avatarImage3.src,
          alt: 'Wellie Edwards',
          width: avatarImage3.width,
          height: avatarImage3.height,
        },
        description:
          'Wellie Edwards is a fashion designer and stylist with a passion for creating unique and stylish outfits. She has a keen eye for detail and loves to experiment with different styles and trends.',
      },
    },
    {
      id: '4',
      title: 'The most loved Soar on social in 2025',
      handle: 'the-most-loved-soar-on-social-in-2025',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.pexels.com/photos/534080/pexels-photo-534080.jpeg',
        alt: 'The most loved Soar on social in 2025',
        width: 3637,
        height: 2432,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '3 min read',
      author: {
        name: 'Alex Klein',
        avatar: {
          src: avatarImage4.src,
          alt: 'Alex Klein',
          width: avatarImage4.width,
          height: avatarImage4.height,
        },
        description:
          'Alex Klein is a fashion designer and stylist with a passion for creating unique and stylish outfits. He has a keen eye for detail and loves to experiment with different styles and trends.',
      },
    },
    {
      id: '5',
      title: 'The winter destinations defining Canadian travel this season',
      handle: 'the-winter-destinations-defining-canadian-travel-this-season',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.pexels.com/photos/34618836/pexels-photo-34618836.jpeg',
        alt: 'The winter destinations defining Canadian travel this season',
        width: 3637,
        height: 2432,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '3 min read',
      author: {
        name: 'Eden Birch',
        avatar: {
          src: avatarImage1.src,
          alt: 'Eden Birch',
          width: avatarImage1.width,
          height: avatarImage1.height,
        },
        description:
          'Eden Birch is a fashion designer and stylist with a passion for creating unique and stylish outfits. She has a keen eye for detail and loves to experiment with different styles and trends.',
      },
    },
    {
      id: '6',
      title: 'The best places to visit in 2026',
      handle: 'the-best-places-to-visit-in-2026',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.pexels.com/photos/5480838/pexels-photo-5480838.jpeg',
        alt: 'The best places to visit in 2026',
        width: 3773,
        height: 600,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '3 min read',
      author: {
        name: 'Scott Edwards',
        avatar: {
          src: avatarImage2.src,
          alt: 'Scott Edwards',
          width: avatarImage2.width,
          height: avatarImage2.height,
        },
        description:
          'Scott Edwards is a fashion designer and stylist with a passion for creating unique and stylish outfits. He has a keen eye for detail and loves to experiment with different styles and trends.',
      },
    },
    {
      id: '7',
      title: 'We had the most spectacular view.',
      handle: 'we-had-the-most-spectacular-view',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.pexels.com/photos/289472/pexels-photo-289472.jpeg',
        alt: 'The best places to visit in 2026',
        width: 3773,
        height: 600,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '3 min read',
      author: {
        name: 'Scott Edwards',
        avatar: {
          src: avatarImage2.src,
          alt: 'Scott Edwards',
          width: avatarImage2.width,
          height: avatarImage2.height,
        },
        description:
          'Scott Edwards is a fashion designer and stylist with a passion for creating unique and stylish outfits. He has a keen eye for detail and loves to experiment with different styles and trends.',
      },
    },
    {
      id: '8',
      title: 'Spectacular views of Queenstown.',
      handle: 'spectacular-views-of-queenstown',
      excerpt:
        'Illo sint voluptas. Error voluptates culpa eligendi. Hic vel totam vitae illo. Non aliquid explicabo necessitatibus unde. Sed exercitationem placeat consectetur nulla deserunt vel. Iusto corrupti dicta.',
      featuredImage: {
        src: 'https://images.pexels.com/photos/29989518/pexels-photo-29989518.jpeg',
        alt: 'The best places to visit in 2026',
        width: 3773,
        height: 600,
      },
      date: 'Mar 16, 2020',
      datetime: '2020-03-16',
      category: { title: 'Marketing', href: '#' },
      timeToRead: '3 min read',
      author: {
        name: 'Scott Edwards',
        avatar: {
          src: avatarImage1.src,
          alt: 'Scott Edwards',
          width: avatarImage1.width,
          height: avatarImage1.height,
        },
        description:
          'Scott Edwards is a fashion designer and stylist with a passion for creating unique and stylish outfits. He has a keen eye for detail and loves to experiment with different styles and trends.',
      },
    },
  ]
}
export function getBlogPostsByHandle(handle: string) {
  // lower case the handle
  handle = handle.toLowerCase()

  const posts = getBlogPosts()
  const post = posts.find((post) => post.handle === handle) ?? posts[0]
  return {
    ...post,
    content: (post as any)?.content || (post as any)?.body || (post as any)?.excerpt || 'Lorem ipsum dolor ...',
    tags: ['travel', 'guide', 'tips'],
  }
}

//
export type TListingReivew = Awaited<ReturnType<typeof getListingReviews>>[number]
export type TBlogPost = Awaited<ReturnType<typeof getBlogPosts>>[number]

// Get Listings search Filter Options
export function getStayListingFilterOptions() {
  return [
    {
      label: 'Property type',
      name: 'propertyType',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Entire place',
          value: 'entire_place',
          description: 'Have a place to yourself',
          defaultChecked: true,
        },
        {
          name: 'Private room',
          value: 'private_room',
          description: 'Have your own room and share some common spaces',
          defaultChecked: true,
        },
        {
          name: 'Hotel room',
          value: 'hotel_room',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Shared room',
          value: 'shared_room',
          description: 'Stay in a shared space, like a common room',
        },
      ],
    },
    {
      label: 'Price range',
      name: 'priceRange',
      tabUIType: 'price-range',
      min: 0,
      max: 1000,
    },
    {
      label: 'Rooms & beds',
      name: 'roomsAndBeds',
      tabUIType: 'select-number',
      options: [
        { name: 'Beds', max: 10 },
        { name: 'Bedrooms', max: 10 },
        { name: 'Bathrooms', max: 10 },
      ],
    },
    {
      label: 'Amenities',
      name: 'amenities',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Kitchen',
          value: 'kitchen',
          description: 'Have a place to yourself',
          defaultChecked: true,
        },
        {
          name: 'Air conditioning',
          value: 'air_conditioning',
          description: 'Have your own room and share some common spaces',
          defaultChecked: true,
        },
        {
          name: 'Heating',
          value: 'heating',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Dryer',
          value: 'dryer',
          description: 'Stay in a shared space, like a common room',
        },
        {
          name: 'Washer',
          value: 'washer',
          description: 'Stay in a shared space, like a common room',
        },
      ],
    },
    {
      label: 'Facilities',
      name: 'facilities',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Free parking on premise',
          value: 'free_parking_on_premise',
          description: 'Have a place to yourself',
        },
        {
          name: 'Hot tub',
          value: 'hot_tub',
          description: 'Have your own room and share some common spaces',
        },
        {
          name: 'Gym',
          value: 'gym',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Pool',
          value: 'pool',
          description: 'Stay in a shared space, like a common room',
        },
        {
          name: 'EV charger',
          value: 'ev_charger',
          description: 'Stay in a shared space, like a common room',
        },
      ],
    },
    {
      label: 'Property type',
      name: 'listingCategory',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'House',
          value: 'house',
          description: 'Have a place to yourself',
        },
        {
          name: 'Bed and breakfast',
          value: 'bed_and_breakfast',
          description: 'Have your own room and share some common spaces',
        },
        {
          name: 'Apartment',
          defaultChecked: true,
          value: 'apartment',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Boutique hotel',
          value: 'boutique_hotel',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Bungalow',
          value: 'bungalow',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Chalet',
          defaultChecked: true,
          value: 'chalet',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Condominium',
          defaultChecked: true,
          value: 'condominium',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Cottage',
          value: 'cottage',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Guest suite',
          value: 'guest_suite',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Guesthouse',
          value: 'guesthouse',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
      ],
    },
    {
      label: 'House rules',
      name: 'houseRules',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Pets allowed',
          value: 'pets_allowed',
          description: 'Have a place to yourself',
        },
        {
          name: 'Smoking allowed',
          value: 'smoking_allowed',
          description: 'Have your own room and share some common spaces',
        },
      ],
    },
  ]
}
export function getExperienceListingFilterOptions() {
  return [
    {
      label: 'Exprience type',
      name: 'experienceType',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Food & drink',
          value: 'food_drink',
          description: 'Try local cooking classes, and more.',
          defaultChecked: true,
        },
        {
          name: 'Outdoor',
          value: 'outdoor',
          description: 'Explore nature, and outdoor activities.',
          defaultChecked: true,
        },
        {
          name: 'Arts & culture',
          value: 'arts_culture',
          description: 'Discover local art experiences.',
        },

        {
          name: 'Adventure',
          value: 'adventure',
          description: 'Experience thrilling activities.',
        },
      ],
    },
    {
      label: 'Price range',
      name: 'priceRange',
      tabUIType: 'price-range',
      min: 0,
      max: 1000,
    },
    {
      label: 'Duration',
      name: 'duration',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Less than 1 hour',
          value: 'less_than_1_hour',
          description: 'Experience activities that last less than 1 hour.',
          defaultChecked: true,
        },
        {
          name: '1-2 hours',
          value: '1_2_hours',
          description: 'Experience activities that last 1-2 hours.',
          defaultChecked: true,
        },
        {
          name: '2-4 hours',
          value: '2_4_hours',
          description: 'Experience activities that last 2-4 hours.',
        },
        {
          name: 'More than 4 hours',
          value: 'more_than_4_hours',
          description: 'Experience activities that last more than 4 hours.',
        },
      ],
    },
    {
      label: 'Time of day',
      name: 'timeOfDay',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Morning',
          value: 'morning',
          description: 'Experience activities in the morning.',
          defaultChecked: true,
        },
        {
          name: 'Afternoon',
          value: 'afternoon',
          description: 'Experience activities in the afternoon.',
          defaultChecked: true,
        },
        {
          name: 'Evening',
          value: 'evening',
          description: 'Experience activities in the evening.',
        },
        {
          name: 'Night',
          value: 'night',
          description: 'Experience activities at night.',
        },
      ],
    },
    {
      label: 'Amenities',
      name: 'amenities',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Kitchen',
          value: 'kitchen',
          description: 'Have a place to yourself',
          defaultChecked: true,
        },
        {
          name: 'Air conditioning',
          value: 'air_conditioning',
          description: 'Have your own room and share some common spaces',
          defaultChecked: true,
        },
        {
          name: 'Heating',
          value: 'heating',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Dryer',
          value: 'dryer',
          description: 'Stay in a shared space, like a common room',
        },
        {
          name: 'Washer',
          value: 'washer',
          description: 'Stay in a shared space, like a common room',
        },
      ],
    },
    {
      label: 'Facilities',
      name: 'facilities',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Free parking on premise',
          value: 'free_parking_on_premise',
          description: 'Have a place to yourself',
        },
        {
          name: 'Hot tub',
          value: 'hot_tub',
          description: 'Have your own room and share some common spaces',
        },
        {
          name: 'Gym',
          value: 'gym',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Pool',
          value: 'pool',
          description: 'Stay in a shared space, like a common room',
        },
        {
          name: 'EV charger',
          value: 'ev_charger',
          description: 'Stay in a shared space, like a common room',
        },
      ],
    },
  ]
}
export function getRealEstateListingFilterOptions() {
  return [
    {
      label: 'Property type',
      name: 'listingCategory',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Entire place',
          value: 'entire_place',
          description: 'Have a place to yourself',
          defaultChecked: true,
        },
        {
          name: 'Private room',
          value: 'private_room',
          description: 'Have your own room and share some common spaces',
          defaultChecked: true,
        },
        {
          name: 'Hotel room',
          value: 'hotel_room',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Shared room',
          value: 'shared_room',
          description: 'Stay in a shared space, like a common room',
        },
      ],
    },
    {
      label: 'Price range',
      name: 'priceRange',
      tabUIType: 'price-range',
      min: 0,
      max: 1000,
    },
    {
      label: 'Rooms & Beds',
      name: 'roomsAndBeds',
      tabUIType: 'select-number',
      options: [
        { name: 'Beds', max: 10 },
        { name: 'Bedrooms', max: 10 },
        { name: 'Bathrooms', max: 10 },
      ],
    },
    {
      label: 'Amenities',
      name: 'amenities',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Kitchen',
          value: 'kitchen',
          description: 'Have a place to yourself',
          defaultChecked: true,
        },
        {
          name: 'Air conditioning',
          value: 'air_conditioning',
          description: 'Have your own room and share some common spaces',
          defaultChecked: true,
        },
        {
          name: 'Heating',
          value: 'heating',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Dryer',
          value: 'dryer',
          description: 'Stay in a shared space, like a common room',
        },
        {
          name: 'Washer',
          value: 'washer',
          description: 'Stay in a shared space, like a common room',
        },
      ],
    },
    {
      label: 'Facilities',
      name: 'facilities',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Free parking on premise',
          value: 'free_parking_on_premise',
          description: 'Have a place to yourself',
        },
        {
          name: 'Hot tub',
          value: 'hot_tub',
          description: 'Have your own room and share some common spaces',
        },
        {
          name: 'Gym',
          value: 'gym',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Pool',
          value: 'pool',
          description: 'Stay in a shared space, like a common room',
        },
        {
          name: 'EV charger',
          value: 'ev_charger',
          description: 'Stay in a shared space, like a common room',
        },
      ],
    },
    {
      label: 'Property type',
      name: 'propertyType',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'House',
          value: 'house',
          description: 'Have a place to yourself',
        },
        {
          name: 'Bed and breakfast',
          value: 'bed_and_breakfast',
          description: 'Have your own room and share some common spaces',
        },
        {
          name: 'Apartment',
          defaultChecked: true,
          value: 'apartment',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Boutique hotel',
          value: 'boutique_hotel',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Bungalow',
          value: 'bungalow',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Chalet',
          defaultChecked: true,
          value: 'chalet',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Condominium',
          defaultChecked: true,
          value: 'condominium',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Cottage',
          value: 'cottage',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Guest suite',
          value: 'guest_suite',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
        {
          name: 'Guesthouse',
          value: 'guesthouse',
          description: 'Have a private or shared room in a boutique hotel, hostel, and more',
        },
      ],
    },
    {
      label: 'House rules',
      name: 'houseRules',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Pets allowed',
          value: 'pets_allowed',
          description: 'Have a place to yourself',
        },
        {
          name: 'Smoking allowed',
          value: 'smoking_allowed',
          description: 'Have your own room and share some common spaces',
        },
      ],
    },
  ]
}
export function getCarListingFilterOptions() {
  return [
    {
      label: 'Car type',
      name: 'Car-type',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Sedan',
          value: 'sedan',
          description: 'Comfortable and spacious for city driving.',
          defaultChecked: true,
        },
        {
          name: 'SUV',
          value: 'suv',
          description: 'Perfect for off-road adventures and family trips.',
          defaultChecked: true,
        },
        {
          name: 'Truck',
          value: 'truck',
          description: 'Ideal for heavy loads and rugged terrain.',
        },
        {
          name: 'Convertible',
          value: 'convertible',
          description: 'Enjoy the open air with a stylish ride.',
        },
      ],
    },
    {
      label: 'Price range',
      name: 'Price-range',
      tabUIType: 'price-range',
      min: 0,
      max: 1000,
    },
    {
      label: 'Fuel type',
      name: 'Fuel-type',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Petrol',
          value: 'petrol',
          description: 'Standard fuel type for most vehicles.',
          defaultChecked: true,
        },
        {
          name: 'Diesel',
          value: 'diesel',
          description: 'More fuel-efficient for long distances.',
          defaultChecked: true,
        },
        {
          name: 'Electric',
          value: 'electric',
          description: 'Eco-friendly and cost-effective.',
        },
        {
          name: 'Hybrid',
          value: 'hybrid',
          description: 'Combines petrol and electric for efficiency.',
        },
      ],
    },
    {
      label: 'Transmission type',
      name: 'Transmission-type',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Automatic',
          value: 'automatic',
          description: 'Easy to drive with no manual shifting.',
          defaultChecked: true,
        },
        {
          name: 'Manual',
          value: 'manual',
          description: 'For those who prefer more control.',
        },
      ],
    },
    {
      label: 'Amenities',
      name: 'Amenities',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Air conditioning',
          value: 'air_conditioning',
          description: 'Stay cool during your drive.',
          defaultChecked: true,
        },
        {
          name: 'GPS',
          value: 'gps',
          description: 'Never get lost with built-in navigation.',
          defaultChecked: true,
        },
        {
          name: 'Bluetooth',
          value: 'bluetooth',
          description: 'Connect your devices for hands-free calls and music.',
        },
        {
          name: 'Sunroof',
          value: 'sunroof',
          description: 'Enjoy the sunshine and fresh air.',
        },
      ],
    },
  ]
}
export function getFlightFilterOptions() {
  return [
    {
      label: 'Airlines',
      name: 'airlines',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Korean Air',
          value: 'korean_air',
          description: 'Flag carrier and largest airline of South Korea.',
          defaultChecked: true,
        },
        {
          name: 'Singapore Airlines',
          value: 'singapore_airlines',
          description: 'Flag carrier of Singapore, known for its service.',
          defaultChecked: true,
        },
        {
          name: 'Philippine Airlines',
          value: 'philippine_airlines',
          description: 'Flag carrier of the Philippines.',
        },
      ],
    },
    {
      label: 'Guests',
      name: 'guests',
      tabUIType: 'select-number',
      options: [
        { name: 'Adults', max: 10 },
        { name: 'Children', max: 10 },
        { name: 'Infants', max: 10 },
      ],
    },
    {
      label: 'Price range',
      name: 'priceRange',
      tabUIType: 'price-range',
      min: 0,
      max: 10000,
    },
    {
      label: 'Number of stops',
      name: 'numberOfStops',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Any number of stops',
          value: 'any_stops',
          description: 'Include flights with any number of stops.',
          defaultChecked: true,
        },
        {
          name: 'Non-stop',
          value: 'non_stop',
          description: 'Direct flights with no layovers.',
        },
        {
          name: '1 stop',
          value: '1_stop',
          description: 'Flights with one layover.',
        },
        {
          name: '2+ stops',
          value: '2_plus_stops',
          description: 'Flights with two or more layovers.',
        },
      ],
    },
    {
      label: 'Flight duration',
      name: 'flightDuration',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Less than 5 hours',
          value: 'less_than_5_hours',
          description: 'Short flights for quick trips.',
          defaultChecked: true,
        },
        {
          name: '5-10 hours',
          value: '5_10_hours',
          description: 'Medium-haul flights for regional travel.',
          defaultChecked: true,
        },
        {
          name: 'More than 10 hours',
          value: 'more_than_10_hours',
          description: 'Long-haul flights for international travel.',
        },
      ],
    },
    {
      label: 'Class type',
      name: 'classType',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'Economy Class',
          value: 'economy_class',
          description: 'Affordable and comfortable seating.',
          defaultChecked: true,
        },
        {
          name: 'Business Class',
          value: 'business_class',
          description: 'Premium seating with extra amenities.',
          defaultChecked: true,
        },
        {
          name: 'First Class',
          value: 'first_class',
          description: 'Luxury seating with top-notch service.',
        },
        {
          name: 'Premium Economy',
          value: 'premium_economy',
          description: 'Enhanced comfort and service in economy.',
        },
      ],
    },
    {
      label: 'Amenities',
      name: 'amenities',
      tabUIType: 'checkbox',
      options: [
        {
          name: 'In-flight entertainment',
          value: 'in_flight_entertainment',
          description: 'Enjoy movies, music, and games during your flight.',
          defaultChecked: true,
        },
        {
          name: 'Wi-Fi',
          value: 'wifi',
          description: 'Stay connected with in-flight Wi-Fi.',
          defaultChecked: true,
        },
        {
          name: 'Meal service',
          value: 'meal_service',
          description: 'Enjoy complimentary meals and snacks.',
        },
        {
          name: 'Extra legroom',
          value: 'extra_legroom',
          description: 'More space for a comfortable journey.',
        },
      ],
    },
  ]
}

export const ICONS_MAP: Record<string, IconSvgElement> = {
  Wifi01Icon: Wifi01Icon,
  BedSingle02Icon: BedSingle02Icon,
  CarParking01Icon: CarParking01Icon,
  KitchenUtensilsIcon: KitchenUtensilsIcon,
  Beach02FreeIcons: Beach02FreeIcons,
  PinLocation03Icon: PinLocation03Icon,
  CheckmarkCircle02Icon: CheckmarkCircle02Icon,
  AirplaneSeatIcon: AirplaneSeatIcon,
  SteeringIcon: SteeringIcon,
  Fan01Icon: Fan01Icon,
  AutomotiveBattery01Icon: AutomotiveBattery01Icon,
  AutomotiveBattery02Icon: AutomotiveBattery02Icon,
  Briefcase09Icon: Briefcase09Icon,
  ChefHatIcon: ChefHatIcon,
  Clock01Icon: Time04Icon,
  UserMultipleIcon: UserMultipleIcon,
  ShoppingBag02Icon: ShoppingBag02Icon,
  GolfCartIcon: GolfCartIcon,
  EquipmentGym03Icon: EquipmentGym03Icon,
  HairDryerIcon: HairDryerIcon,
  WindTurbineIcon: WindTurbineIcon,
  DishWasherIcon: DishWasherIcon,
  Tv01Icon: Tv01Icon,
  FirewallIcon: FirewallIcon,
  FireExtinguisherIcon: FireExtinguisherIcon,
  PoolIcon: PoolIcon,
  PoolTableIcon: PoolTableIcon,
  Dumbbell02Icon: Dumbbell02Icon,
  LaptopIcon: LaptopIcon,
  DryerIcon: HairDryerFreeIcons,
  WheelchairIcon: WheelchairIcon,
  SlowWindsIcon: SlowWindsIcon,
  HandSanitizerIcon: HandSanitizerIcon,
  AiGameIcon: AiGameIcon,
  AlarmSmokeIcon: AlarmSmokeIcon,
  Alien02Icon: Alien02Icon,
  AmpouleIcon: AmpouleIcon,
  Astronaut01Icon: Astronaut01Icon,
  NoodlesIcon: NoodlesIcon,
  HairClipsIcon: HairClipsIcon,
  RunningShoesIcon: RunningShoesIcon,
  MountainIcon: MountainIcon,
  Beach02Icon: Beach02Icon,
  EarthIcon: EarthIcon,
  ColorsIcon: ColorsIcon,
  City03Icon: City03Icon,
  AccelerationIcon: AccelerationIcon,
  StarCircleIcon: StarCircleIcon,
}
