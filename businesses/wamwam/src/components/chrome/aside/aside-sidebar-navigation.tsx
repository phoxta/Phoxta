import Aside from "@/components/chrome/aside";
import SidebarNavigation from "@/components/chrome/header/sidebar-navigation";

export default function AsideSidebarNavigation() {
    return (
        <Aside openFrom="right" type="sidebar-navigation" logoOnHeading contentMaxWidthClassName="max-w-lg">
            <div className="flex h-full flex-col">
                <div className="hidden-scrollbar flex-1 overflow-x-hidden overflow-y-auto py-6">
                    <SidebarNavigation />
                </div>
            </div>
        </Aside>
    );
}
