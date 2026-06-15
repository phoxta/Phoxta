import Aside from './aside'
import SidebarNavigation from './header/navigation/sidebar-navigation'

interface Props {
  className?: string
}

const AsideSidebarNavigation = async ({ className }: Props) => {
  return (
    <Aside openFrom="right" type="sidebar-navigation" logoOnHeading contentMaxWidthClassName="max-w-lg">
      <div className="flex h-full flex-col">
        <div className="hidden-scrollbar flex-1 overflow-x-hidden overflow-y-auto py-6">
          <SidebarNavigation />
        </div>
      </div>
    </Aside>
  )
}

export default AsideSidebarNavigation
