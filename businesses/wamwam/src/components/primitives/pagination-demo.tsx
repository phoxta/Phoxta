import {
    Pagination,
    PaginationGap,
    PaginationList,
    PaginationNext,
    PaginationPage,
    PaginationPrevious,
} from "./pagination";

/**
 * Static demo pager: pages 1–66 with page 3 current. No page is actually
 * paginated yet, so the hrefs are literal `?page=` queries.
 */
export default function PaginationDemo() {
    return (
        <Pagination>
            <PaginationPrevious href="?page=2" />
            <PaginationList>
                <PaginationPage href="?page=1">1</PaginationPage>
                <PaginationPage href="?page=2">2</PaginationPage>
                <PaginationPage href="?page=3" current>
                    3
                </PaginationPage>
                <PaginationGap />
                <PaginationPage href="?page=65">65</PaginationPage>
                <PaginationPage href="?page=66">66</PaginationPage>
            </PaginationList>
            <PaginationNext href="?page=4" />
        </Pagination>
    );
}
