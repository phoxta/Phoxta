import SectionGridPosts from '@/components/blog/section-grid-posts'
import SectionMagazine5 from '@/components/blog/section-magazine5'
import { Divider } from '@/components/primitives/divider'
import NewsletterSection from '@/components/sections/newsletter-section-1'
import { getBlogPosts } from '@/data/content'

export default function BlogPage() {
  const blogPosts = getBlogPosts()

  return (
    <div className="container flex flex-col gap-24 pt-12 pb-24 sm:pt-14 xl:gap-28 xl:pb-28">
      <SectionMagazine5 posts={blogPosts} />
      <Divider />
      <SectionGridPosts posts={blogPosts} />
      <NewsletterSection />
    </div>
  )
}
