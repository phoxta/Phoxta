export default function ByPagination({ handlePreviousPage, totalPages, currentPage, handlePageChange, handleNextPage }: any) {

	return (
		<>
			<nav aria-label="Page navigation example">
				<ul className="pagination">
					<li className="page-item" onClick={handlePreviousPage}>
						<a className="page-link">
							<svg width={12} height={12} viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
								<path d="M6.00016 1.33325L1.3335 5.99992M1.3335 5.99992L6.00016 10.6666M1.3335 5.99992H10.6668" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</a>
					</li>
					{Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
						<li
							className="page-item"
							key={page}
							onClick={() => handlePageChange(page)}
						>
							<a className={page === currentPage ? "page-link active" : "page-link"}>
								{page}
							</a>
						</li>

					))}
					<li className="page-item" onClick={handleNextPage}>
						<a className="page-link">
							<svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M5.99967 10.6666L10.6663 5.99992L5.99968 1.33325M10.6663 5.99992L1.33301 5.99992" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</a>
					</li>
				</ul>
			</nav>
		</>
	)
}
