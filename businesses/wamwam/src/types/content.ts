/** Editorial content shapes: reviews, blog posts, authors, categories, filters. */

export interface ListingReview {
    id: string;
    title: string;
    rating: number;
    content: string;
    author: string;
    /** Static import object ({ src }) or a URL. */
    authorAvatar: StaticImage | string;
    date: string;
    datetime: string;
}

export interface BlogImage {
    src: string;
    alt: string;
    width?: number;
    height?: number;
}

export interface BlogAuthor {
    name: string;
    avatar: BlogImage;
    description: string;
}

export interface BlogPost {
    id: string;
    title: string;
    handle: string;
    excerpt: string;
    featuredImage: BlogImage;
    date: string;
    datetime: string;
    category: { title: string; href: string };
    timeToRead: string;
    author: BlogAuthor;
    /** Full body, present on live posts and after getBlogPostByHandle enrichment. */
    content?: string;
    body?: string;
}

export interface BlogPostDetail extends BlogPost {
    content: string;
    tags: string[];
}

export interface Author {
    id: number;
    displayName: string;
    handle: string;
    email: string;
    gender: string;
    avatarUrl: string;
    bgImage: string;
    count: number;
    description: string;
    jobName: string;
    starRating: number;
    location: string;
    timeAsHost: { months: number; years: number };
}

export interface AuthorDetail extends Author {
    responseRate: number;
    responseTime: string;
    address: string;
    phone: string;
    languages: string;
    joinedDate: string;
    reviewsCount: number;
    rating: number;
    listingsCount: number;
}

export interface Category {
    id: string;
    name: string;
    /** HTML with <span data-slot="italic"> accents; rendered via dangerouslySetInnerHTML. */
    titleRaw: string;
    subtitle: string;
    region: string;
    handle: string;
    href: string;
    count: number;
    thumbnail: string;
    description: string;
}

export interface CategoryGroup {
    title: string;
    handle: string;
    /** ICONS_MAP key, or "" for no icon (checked by bare truthiness downstream). */
    icon: string;
    categories: Category[];
}

/* ---- Search filter option trees ---- */

export interface FilterChoice {
    name: string;
    value?: string;
    description?: string;
    defaultChecked?: boolean;
    max?: number;
}

export type FilterTabUI = "checkbox" | "radio" | "price-range" | "select-number" | "select";

export interface FilterGroup {
    label: string;
    name: string;
    tabUIType: FilterTabUI;
    options?: FilterChoice[];
    min?: number;
    max?: number;
}
