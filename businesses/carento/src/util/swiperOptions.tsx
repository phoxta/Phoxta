import { Autoplay, Navigation, Pagination } from "swiper/modules"
import { SwiperOptions } from "swiper/types"

export const swiperGroup4 = {
	modules: [Autoplay, Pagination, Navigation],
	spaceBetween: 30,
	slidesPerView: 4,
	slidesPerGroup: 2,
	loop: true,
	navigation: {
		nextEl: '.swiper-button-next',
		prevEl: '.swiper-button-prev',
	},
	autoplay: {
		delay: 10000,
	},
	breakpoints: {
		1199: {
			slidesPerView: 4,
		},
		800: {
			slidesPerView: 3,
		},
		500: {
			slidesPerView: 2,
		},
		350: {
			slidesPerView: 1,
		},
		250: {
			slidesPerView: 1,
		},
	},
}
export const swiperGroup3 = {
	modules: [Autoplay, Pagination, Navigation],
	slidesPerView: 3,
	spaceBetween: 30,
	slidesPerGroup: 1,
	loop: true,
	navigation: {
		nextEl: '.swiper-button-next',
		prevEl: '.swiper-button-prev',
	},
	autoplay: {
		delay: 10000,
	},
	breakpoints: {
		1199: {
			slidesPerView: 3,
		},
		800: {
			slidesPerView: 2,
		},
		400: {
			slidesPerView: 1,
		},
		250: {
			slidesPerView: 1,
		},
	},
}
export const swiperGroup2 = {
	modules: [Autoplay, Pagination, Navigation],
	slidesPerView: 2,
	spaceBetween: 30,
	slidesPerGroup: 1,
	loop: true,
	navigation: {
		nextEl: '.swiper-button-next-2',
		prevEl: '.swiper-button-prev-2',
	},
	autoplay: {
		delay: 10000,
	},
	breakpoints: {
		1199: {
			slidesPerView: 2,
		},
		800: {
			slidesPerView: 1,
		},
		400: {
			slidesPerView: 1,
		},
		250: {
			slidesPerView: 1,
		},
	},
}
export const swiperGroup1 = {
	modules: [Autoplay, Pagination, Navigation],
	slidesPerView: 1,
	spaceBetween: 50,
	slidesPerGroup: 1,
	loop: true,
	navigation: {
		nextEl: '.swiper-button-next',
		prevEl: '.swiper-button-prev',
	},
	pagination: {
		el: '.swiper-pagination-group-1',
		clickable: true,
	},
	autoplay: {
		delay: 100000,
	},
}
export const swiperGroupAnimate: SwiperOptions = {
	modules: [Autoplay, Pagination, Navigation],
	spaceBetween: 24,
	slidesPerView: 'auto',
	slidesPerGroup: 1,
	loop: true,
	speed: 1000,
	navigation: {
		nextEl: '.swiper-button-next-animate',
		prevEl: '.swiper-button-prev-animate',
	},
	autoplay: {
		delay: 10000,
	},
	breakpoints: {
		1199: {
			slidesPerView: 'auto',
		},
		600: {
			slidesPerView: 'auto',
		},
		575: {
			slidesPerView: 1,
		},
		350: {
			slidesPerView: 1,
		},
	},
}