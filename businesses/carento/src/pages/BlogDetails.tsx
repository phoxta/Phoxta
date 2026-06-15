import Layout from "@/components/layout/Layout";
import { swiperGroup3 } from "@/util/swiperOptions";
import Link from "@/components/common/Link";
import { Swiper, SwiperSlide } from "swiper/react";
export default function BlogDetails() {
    return (
        <>
            <Layout footerStyle={1}>
                <div>
                    <div className="page-header pt-30 background-body">
                        <div className="custom-container position-relative mx-auto">
                            <div className="bg-overlay rounded-12 overflow-hidden">
                                <img className="w-100 h-100 rounded-12 img-banner" src="/assets/imgs/page-header/banner3.png" alt="Carento" />
                            </div>
                            <div className="container position-absolute z-1 top-50 start-50 translate-middle d-none d-lg-block">
                                <span className="btn btn-label-tag background-3">Industry News</span>
                                <h2 className="text-white py-3  w-75">How to Choose the Right Rental Car for Your Needs</h2>
                                <div className="card-meta-user">
                                    <div className="box-author-small">
                                        <img className="border-0" src="/assets/imgs/blog/blog-grid/avatar3.png" alt="Carento" />
                                        <p className="text-sm-bold">By Jimmy Dave</p>
                                    </div>
                                    <div className="card-meta gap-2 d-flex">
                                        <span className="post-date text-white">18 Sep 2024</span>
                                        <span className="post-time text-white">6 mins</span>
                                        <span className="post-comment text-white">38 comments</span>
                                    </div>
                                </div>
                            </div>
                            <div className="background-body position-absolute z-1 top-100 start-50 translate-middle px-3 py-2 rounded-12 border gap-3 d-none d-md-flex w-md-75">
                                <Link href="/" className="neutral-700 text-md-medium">
                                    Home
                                </Link>
                                <span>
                                    <img src="/assets/imgs/template/icons/arrow-right.svg" alt="Carento" />
                                </span>
                                <Link href="/blog-grid" className="neutral-700 text-md-bold">
                                    News
                                </Link>
                                <span>
                                    <img src="/assets/imgs/template/icons/arrow-right.svg" alt="Carento" />
                                </span>
                                <span className="neutral-1000 text-md-bold">How to Choose the Right Rental Car for Your Needs</span>
                            </div>
                        </div>
                    </div>
                    {/* blog-details */}
                    <section className="box-section background-body">
                        <div className="container d-block d-lg-none">
                            <span className="btn btn-label-tag background-3 mt-80">Industry News</span>
                            <h2 className="py-3">How to Choose the Right Rental Car for Your Needs</h2>
                            <div className="card-meta-user">
                                <div className="box-author-small">
                                    <img className="border-0" src="/assets/imgs/blog/blog-grid/avatar3.png" alt="Carento" />
                                    <span className="text-sm-bold">By Jimmy Dave</span>
                                </div>
                                <div className="card-meta gap-2 d-flex">
                                    <span className="post-date">18 Sep 2024</span>
                                    <span className="post-time">6 mins</span>
                                    <span className="post-comment">38 comments</span>
                                </div>
                            </div>
                        </div>
                        <div className="container">
                            <div className="section-box background-body pt-96">
                                <div className="container">
                                    <div className="row">
                                        <div className="col-lg-8 mb-35">
                                            <div className="box-content-detail-blog">
                                                <div className="box-content-info-detail mt-0 pt-0">
                                                    <p className="text-xl-medium mb-20 neutral-1000">Choosing the right rental car can make or break your trip, whether it's a weekend getaway, a business trip, or an extended vacation. With so many options available, selecting the perfect vehicle can feel overwhelming. However, by considering a few key factors, you can easily find a car that suits your needs and enhances your overall experience.</p>
                                                    <div className="content-detail-post">
                                                        <h6>Determine Your Trip Purpose</h6>
                                                        <p className="neutral-1000">The first step in choosing the right rental car is to clearly define the purpose of your trip. Are you traveling alone or with family? Is it a business trip or a leisure vacation? The purpose of your trip will greatly influence the type of car you need. For instance, a compact car might be ideal for a solo business trip in a busy city, while a spacious SUV or minivan would be better suited for a family road trip.</p>
                                                    </div>
                                                    <div className="d-flex flex-md-row flex-column align-items-center justify-content-center gap-3 mb-30">
                                                        <div>
                                                            <img src="/assets/imgs/blog/blog-details/img-1.png" alt="Carento" />
                                                        </div>
                                                        <div>
                                                            <img src="/assets/imgs/blog/blog-details/img-2.png" alt="Carento" />
                                                        </div>
                                                    </div>
                                                    <div className="content-detail-post">
                                                        <h6>Consider the Number of Passengers and Luggage</h6>
                                                        <p>The number of passengers and the amount of luggage you need to carry are crucial factors in choosing a rental car. If you're traveling with a large group or have plenty of baggage, a larger vehicle like an SUV or minivan will provide the space and comfort you need. On the other hand, if you're traveling light or with just one other person, a compact or mid-size car may be more economical and easier to maneuver.</p>
                                                        <h6>Think About the Terrain and Weather Conditions</h6>
                                                        <p>Where you’re going plays a significant role in your choice of rental car. If you're planning to drive in a mountainous region or during winter, a vehicle with all-wheel drive (AWD) or four-wheel drive (4WD) might be necessary for safety. For urban areas with smooth roads, a standard sedan or compact car should suffice. Additionally, consider the climate; air conditioning is essential in hot climates, while heated seats can be a nice touch in colder regions.</p>
                                                    </div>
                                                    <div className="row mb-30 d-none d-md-block">
                                                        <div className="col-8 mx-auto">
                                                            <div className="p-4 position-relative">
                                                                <img className="position-absolute top-0 start-0 bottom-0 end-0 z-0 h-100" src="/assets/imgs/blog/blog-details/banner-img.png" alt="Carento" />
                                                                <img className="position-absolute top-0 end-0 z-1" src="/assets/imgs/blog/blog-details/banner-car.png" alt="Carento" />
                                                                <div className="position-relative z-1">
                                                                    <h6 className="text-white">Need a Car? Rent now!</h6>
                                                                    <p className="text-xs-medium text-white">Find the perfect vehicle for your journey today.</p>
                                                                    <Link href="#" className="btn btn-primary px-2 py-1 rounded-2 mt-1">
                                                                        Get started
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="content-detail-post">
                                                        <h6>Evaluate Fuel Efficiency</h6>
                                                        <p>Fuel costs can add up quickly, especially on long trips. If you're concerned about your budget, consider renting a car with good fuel efficiency. Compact cars, hybrids, and even some modern SUVs offer excellent mileage, helping you save money at the pump. However, if fuel cost is not a primary concern and comfort or capacity is more important, you might opt for a larger vehicle.</p>
                                                        <h6>Assess Your Budget</h6>
                                                        <p>Your budget is another crucial factor when choosing a rental car. Rental rates vary depending on the vehicle type, rental duration, and additional services or features. Set a budget before you start comparing options and stick to it. Remember to factor in additional costs like insurance, fuel, and any extras such as GPS, child seats, or toll passes.</p>
                                                        <h6>Check for Special Requirements or Preferences</h6>
                                                        <div className="d-lg-flex gap-4">
                                                            <p>The number of passengers and the amount of luggage you need to carry are crucial factors in choosing a rental car. If you're traveling with a large group or have plenty of baggage, a larger vehicle like an SUV or minivan will provide the space and comfort you need. On the other hand, if you're traveling light or with just one other person, a compact or mid-size car may be more economical and easier to maneuver.</p>
                                                            <p>The number of passengers and the amount of luggage you need to carry are crucial factors in choosing a rental car. If you're traveling with a large group or have plenty of baggage, a larger vehicle like an SUV or minivan will provide the space and comfort you need. On the other hand, if you're traveling light or with just one other person, a compact or mid-size car may be more economical and easier to maneuver.</p>
                                                        </div>
                                                        <div className="d-flex flex-md-row flex-column align-items-center justify-content-center gap-3 mb-30">
                                                            <div>
                                                                <img src="/assets/imgs/blog/blog-details/img-3.png" alt="Carento" />
                                                            </div>
                                                            <div>
                                                                <img src="/assets/imgs/blog/blog-details/img-4.png" alt="Carento" />
                                                            </div>
                                                        </div>
                                                        <h6>Conclusion</h6>
                                                        <p>Choosing the right rental car involves more than just picking a vehicle that looks good. By considering the purpose of your trip, the number of passengers, the terrain, fuel efficiency, and your budget, you can select a car that will make your journey smooth, comfortable, and enjoyable. Take your time to compare options and book in advance to ensure you get the best vehicle for your needs. Whether you're hitting the open road or navigating city streets, the right rental car can make all the difference in your travel experience.</p>
                                                    </div>
                                                    <div className="footer-post-tags mb-100">
                                                        <div className="box-tags">
                                                            <Link className="btn btn-tag" href="#">
                                                                Travel
                                                            </Link>
                                                            <Link className="btn btn-tag" href="#">
                                                                Temple items
                                                            </Link>
                                                            <Link className="btn btn-tag" href="#">
                                                                Ancient
                                                            </Link>
                                                        </div>
                                                        <div className="box-share">
                                                            <div className="d-flex align-items-center justify-content-center justify-content-md-end flex-wrap">
                                                                <p className="text-lg-bold neutral-1000 d-inline-block mr-10 mb-0">Share this:</p>
                                                                <div className="box-socials d-inline-block d-flex gap-2">
                                                                    <Link className="icon-shape icon-md rounded-circle border icon-instagram" href="#">
                                                                        <svg width={20} height={20} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path
                                                                                d="M13.4915 1.6665H6.50817C3.47484 1.6665 1.6665 3.47484 1.6665 6.50817V13.4832C1.6665 16.5248 3.47484 18.3332 6.50817 18.3332H13.4832C16.5165 18.3332 18.3248 16.5248 18.3248 13.4915V6.50817C18.3332 3.47484 16.5248 1.6665 13.4915 1.6665ZM9.99984 13.2332C8.2165 13.2332 6.7665 11.7832 6.7665 9.99984C6.7665 8.2165 8.2165 6.7665 9.99984 6.7665C11.7832 6.7665 13.2332 8.2165 13.2332 9.99984C13.2332 11.7832 11.7832 13.2332 9.99984 13.2332ZM14.9332 5.73317C14.8915 5.83317 14.8332 5.92484 14.7582 6.00817C14.6748 6.08317 14.5832 6.1415 14.4832 6.18317C14.3832 6.22484 14.2748 6.24984 14.1665 6.24984C13.9415 6.24984 13.7332 6.1665 13.5748 6.00817C13.4998 5.92484 13.4415 5.83317 13.3998 5.73317C13.3582 5.63317 13.3332 5.52484 13.3332 5.4165C13.3332 5.30817 13.3582 5.19984 13.3998 5.09984C13.4415 4.9915 13.4998 4.90817 13.5748 4.82484C13.7665 4.63317 14.0582 4.5415 14.3248 4.59984C14.3832 4.60817 14.4332 4.62484 14.4832 4.64984C14.5332 4.6665 14.5832 4.6915 14.6332 4.72484C14.6748 4.74984 14.7165 4.7915 14.7582 4.82484C14.8332 4.90817 14.8915 4.9915 14.9332 5.09984C14.9748 5.19984 14.9998 5.30817 14.9998 5.4165C14.9998 5.52484 14.9748 5.63317 14.9332 5.73317Z"
                                                                                fill="currentColor"
                                                                            />
                                                                        </svg>
                                                                    </Link>
                                                                    <Link className="icon-socials icon-shape icon-md rounded-circle border icon-facebook" href="#">
                                                                        <svg width={20} height={20} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path
                                                                                d="M18.3334 13.4915C18.3334 16.5248 16.5251 18.3332 13.4917 18.3332H12.5001C12.0417 18.3332 11.6667 17.9582 11.6667 17.4998V12.6915C11.6667 12.4665 11.8501 12.2748 12.0751 12.2748L13.5417 12.2498C13.6584 12.2415 13.7584 12.1582 13.7834 12.0415L14.0751 10.4498C14.1001 10.2998 13.9834 10.1582 13.8251 10.1582L12.0501 10.1832C11.8167 10.1832 11.6334 9.99985 11.6251 9.77485L11.5918 7.73317C11.5918 7.59984 11.7001 7.48318 11.8417 7.48318L13.8417 7.44984C13.9834 7.44984 14.0918 7.34152 14.0918 7.19985L14.0584 5.19983C14.0584 5.05816 13.9501 4.94984 13.8084 4.94984L11.5584 4.98318C10.1751 5.00818 9.07509 6.1415 9.10009 7.52484L9.14175 9.8165C9.15008 10.0498 8.96676 10.2332 8.73342 10.2415L7.73341 10.2582C7.59175 10.2582 7.48342 10.3665 7.48342 10.5082L7.50842 12.0915C7.50842 12.2332 7.61675 12.3415 7.75841 12.3415L8.75842 12.3248C8.99176 12.3248 9.17507 12.5082 9.18341 12.7332L9.2584 17.4832C9.26674 17.9498 8.89174 18.3332 8.42507 18.3332H6.50841C3.47508 18.3332 1.66675 16.5248 1.66675 13.4832V6.50817C1.66675 3.47484 3.47508 1.6665 6.50841 1.6665H13.4917C16.5251 1.6665 18.3334 3.47484 18.3334 6.50817V13.4915V13.4915Z"
                                                                                fill="currentColor"
                                                                            />
                                                                        </svg>
                                                                    </Link>
                                                                    <Link className="icon-socials icon-shape icon-md rounded-circle border icon-twitter" href="#">
                                                                        <svg width={21} height={20} viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M12.2845 8.46864L19.5698 0H17.8434L11.5176 7.3532L6.4651 0H0.637695L8.278 11.1193L0.637695 20H2.36419L9.04447 12.2348L14.3802 20H20.2076L12.284 8.46864H12.2845ZM9.9198 11.2173L9.14568 10.1101L2.98627 1.29967H5.63806L10.6088 8.40994L11.3829 9.51718L17.8442 18.7594H15.1925L9.9198 11.2177V11.2173Z" fill="currentColor" />
                                                                        </svg>
                                                                    </Link>
                                                                    <Link className="icon-socials icon-shape icon-md rounded-circle border icon-be" href="#">
                                                                        <svg width={21} height={15} viewBox="0 0 21 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path
                                                                                d="M8.82393 10.736L13.9225 7.78881L8.82393 4.84165V10.736ZM20.1803 3.04389C20.308 3.50561 20.3964 4.12451 20.4554 4.91042C20.5242 5.69633 20.5536 6.37418 20.5536 6.96361L20.6126 7.78881C20.6126 9.94024 20.4554 11.5219 20.1803 12.5337C19.9347 13.4179 19.3649 13.9877 18.4808 14.2333C18.0191 14.361 17.1742 14.4494 15.8775 14.5083C14.6004 14.5771 13.4313 14.6066 12.3507 14.6066L10.7887 14.6655C6.67251 14.6655 4.10848 14.5083 3.09662 14.2333C2.21247 13.9877 1.64269 13.4179 1.39709 12.5337C1.26938 12.072 1.18097 11.4531 1.12203 10.6672C1.05326 9.8813 1.02379 9.20345 1.02379 8.61402L0.964844 7.78881C0.964844 5.63739 1.12203 4.05575 1.39709 3.04389C1.64269 2.15974 2.21247 1.58996 3.09662 1.34436C3.55834 1.21665 4.4032 1.12823 5.69995 1.06929C6.97705 1.00052 8.14609 0.971052 9.22671 0.971052L10.7887 0.912109C14.9049 0.912109 17.4689 1.06929 18.4808 1.34436C19.3649 1.58996 19.9347 2.15974 20.1803 3.04389Z"
                                                                                fill="currentColor"
                                                                            />
                                                                        </svg>
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="box-leave-comment background-100">
                                                        <div className="box-form-reviews">
                                                            <h5 className="neutral-1000 mb-25">Leave a Comment</h5>
                                                            <div className="row">
                                                                <div className="col-md-6">
                                                                    <div className="form-group">
                                                                        <input className="form-control" type="text" placeholder="Your name" />
                                                                    </div>
                                                                </div>
                                                                <div className="col-md-6">
                                                                    <div className="form-group">
                                                                        <input className="form-control" type="text" placeholder="Email address" />
                                                                    </div>
                                                                </div>
                                                                <div className="col-md-12">
                                                                    <div className="form-group">
                                                                        <textarea className="form-control" placeholder="Your comment" />
                                                                    </div>
                                                                </div>
                                                                <div className="col-md-12">
                                                                    <button className="btn btn-primary">
                                                                        Submit Comment
                                                                        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                            <path d="M8 15L15 8L8 1M15 8L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="box-list-comment background-card mb-0">
                                                        <div className="list-reviews">
                                                            <div className="item-review">
                                                                <div className="head-review">
                                                                    <div className="author-review">
                                                                        <img src="/assets/imgs/blog/blog-details/avatar-1.png" alt="Carento" />
                                                                        <div className="author-info">
                                                                            <p className="text-lg-bold neutral-1000">Sarah Johnson</p>
                                                                            <p className="text-sm-medium neutral-500">December 4, 2024 at 3:12 pm</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="rate-review">
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                    </div>
                                                                </div>
                                                                <div className="content-review">
                                                                    <p className="text-sm-medium neutral-800">The views from The High Roller were absolutely stunning! It's a fantastic way to see the Strip and the surrounding area. The cabins are spacious and comfortable, and the audio commentary adds an extra layer of enjoyment. Highly recommend!</p>
                                                                </div>
                                                            </div>
                                                            <div className="item-review">
                                                                <div className="head-review">
                                                                    <div className="author-review">
                                                                        <img src="/assets/imgs/blog/blog-details/avatar-2.png" alt="Carento" />
                                                                        <div className="author-info">
                                                                            <p className="text-lg-bold neutral-1000">Michael Smith</p>
                                                                            <p className="text-sm-medium neutral-500">December 4, 2024 at 3:12 pm</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="rate-review">
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                    </div>
                                                                </div>
                                                                <div className="content-review">
                                                                    <p className="text-sm-medium neutral-800">We had a fantastic time on The High Roller. The views were amazing, and the ride was very smooth. It's a great way to see Las Vegas from a different perspective. The staff were friendly and helpful. Definitely worth it! The High Roller was one of the highlights of our Las Vegas trip.</p>
                                                                </div>
                                                            </div>
                                                            <div className="item-review">
                                                                <div className="head-review">
                                                                    <div className="author-review">
                                                                        <img src="/assets/imgs/blog/blog-details/avatar-3.png" alt="Carento" />
                                                                        <div className="author-info">
                                                                            <p className="text-lg-bold neutral-1000">Emily Williams</p>
                                                                            <p className="text-sm-medium neutral-500">December 4, 2024 at 3:12 pm</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="rate-review">
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                        <img className="background-brand-2 p-1" src="/assets/imgs/template/icons/star-white.svg" alt="Carento" />
                                                                    </div>
                                                                </div>
                                                                <div className="content-review">
                                                                    <p className="text-sm-medium neutral-800">Took my family on The High Roller, and we all loved it! The kids were amazed by the views, and the adults enjoyed the experience just as much. It's suitable for all ages and definitely a highlight of our trip to Vegas. Don't miss your chance to see Las Vegas from a whole new perspective and create memories that will last a lifetime!</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <nav aria-label="Page navigation example">
                                                            <ul className="pagination">
                                                                <li className="page-item">
                                                                    <Link className="page-link" href="#" aria-label="Previous">
                                                                        <span aria-hidden="true">
                                                                            <svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                <path d="M6.00016 1.33325L1.3335 5.99992M1.3335 5.99992L6.00016 10.6666M1.3335 5.99992H10.6668" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                                                            </svg>
                                                                        </span>
                                                                    </Link>
                                                                </li>
                                                                <li className="page-item">
                                                                    <Link className="page-link" href="#">
                                                                        1
                                                                    </Link>
                                                                </li>
                                                                <li className="page-item">
                                                                    <Link className="page-link active" href="#">
                                                                        2
                                                                    </Link>
                                                                </li>
                                                                <li className="page-item">
                                                                    <Link className="page-link" href="#">
                                                                        3
                                                                    </Link>
                                                                </li>
                                                                <li className="page-item">
                                                                    <Link className="page-link" href="#">
                                                                        4
                                                                    </Link>
                                                                </li>
                                                                <li className="page-item">
                                                                    <Link className="page-link" href="#">
                                                                        5
                                                                    </Link>
                                                                </li>
                                                                <li className="page-item">
                                                                    <Link className="page-link" href="#">
                                                                        ...
                                                                    </Link>
                                                                </li>
                                                                <li className="page-item">
                                                                    <Link className="page-link" href="#" aria-label="Next">
                                                                        <span aria-hidden="true">
                                                                            <svg width={12} height={12} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                                <path d="M5.99967 10.6666L10.6663 5.99992L5.99968 1.33325M10.6663 5.99992L1.33301 5.99992" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                                                            </svg>
                                                                        </span>
                                                                    </Link>
                                                                </li>
                                                            </ul>
                                                        </nav>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-lg-4">
                                            <div className="box-search-style-2">
                                                <form action="#">
                                                    <input type="text" placeholder="Search" />
                                                    <input className="btn-search-submit" type="submit" />
                                                </form>
                                            </div>
                                            <div className="box-sidebar-border">
                                                <div className="box-head-sidebar">
                                                    <p className="text-xl-bold neutral-1000">Trending Now</p>
                                                </div>
                                                <div className="box-content-sidebar">
                                                    <ul className="list-posts">
                                                        <li>
                                                            <div className="card-post">
                                                                <div className="card-image">
                                                                    <Link href="/blog-details">
                                                                        <img src="/assets/imgs/blog/blog-list/trending.png" alt="Carento" />
                                                                    </Link>
                                                                </div>
                                                                <div className="card-info">
                                                                    <Link className="text-md-bold neutral-1000" href="/blog-details">
                                                                        How to Choose the Best Insurance for Your Rental Car
                                                                    </Link>
                                                                    <p className="text-sm-medium date-post neutral-500">18 Sep 2024</p>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li>
                                                            <div className="card-post">
                                                                <div className="card-image">
                                                                    <Link href="/blog-details">
                                                                        <img src="/assets/imgs/blog/blog-list/trending1.png" alt="Carento" />
                                                                    </Link>
                                                                </div>
                                                                <div className="card-info">
                                                                    <Link className="text-md-bold neutral-1000" href="/blog-details">
                                                                        The Advantages of Renting a Car for Business Travel
                                                                    </Link>
                                                                    <p className="text-sm-medium date-post neutral-500">18 Sep 2024</p>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li>
                                                            <div className="card-post">
                                                                <div className="card-image">
                                                                    <Link href="/blog-details">
                                                                        <img src="/assets/imgs/blog/blog-list/trending2.png" alt="Carento" />
                                                                    </Link>
                                                                </div>
                                                                <div className="card-info">
                                                                    <Link className="text-md-bold neutral-1000" href="/blog-details">
                                                                        Why Renting a Car Is Ideal for Exploring National Parks
                                                                    </Link>
                                                                    <p className="text-sm-medium date-post neutral-500">18 Sep 2024</p>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li>
                                                            <div className="card-post">
                                                                <div className="card-image">
                                                                    <Link href="/blog-details">
                                                                        <img src="/assets/imgs/blog/blog-list/trending3.png" alt="Carento" />
                                                                    </Link>
                                                                </div>
                                                                <div className="card-info">
                                                                    <Link className="text-md-bold neutral-1000" href="/blog-details">
                                                                        How to Extend Your Car Rental Without Hassle
                                                                    </Link>
                                                                    <p className="text-sm-medium date-post neutral-500">18 Sep 2024</p>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li>
                                                            <div className="card-post">
                                                                <div className="card-image">
                                                                    <Link href="/blog-details">
                                                                        <img src="/assets/imgs/blog/blog-list/trending4.png" alt="Carento" />
                                                                    </Link>
                                                                </div>
                                                                <div className="card-info">
                                                                    <Link className="text-md-bold neutral-1000" href="/blog-details">
                                                                        The Ultimate Checklist for Returning Your Rental Car
                                                                    </Link>
                                                                    <p className="text-sm-medium date-post neutral-500">18 Sep 2024</p>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="box-sidebar-border">
                                                <div className="box-head-sidebar">
                                                    <p className="text-xl-bold neutral-1000">Gallery</p>
                                                </div>
                                                <div className="box-content-sidebar">
                                                    <ul className="list-photo-col-3">
                                                        <li>
                                                            <Link href="#">
                                                                <img src="/assets/imgs/blog/blog-list/cat.png" alt="Carento" />
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link href="#">
                                                                <img src="/assets/imgs/blog/blog-list/cat2.png" alt="Carento" />
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link href="#">
                                                                <img src="/assets/imgs/blog/blog-list/cat3.png" alt="Carento" />
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link href="#">
                                                                <img src="/assets/imgs/blog/blog-list/cat4.png" alt="Carento" />
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link href="#">
                                                                <img src="/assets/imgs/blog/blog-list/cat5.png" alt="Carento" />
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link href="#">
                                                                <img src="/assets/imgs/blog/blog-list/cat6.png" alt="Carento" />
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link href="#">
                                                                <img src="/assets/imgs/blog/blog-list/cat7.png" alt="Carento" />
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link href="#">
                                                                <img src="/assets/imgs/blog/blog-list/cat8.png" alt="Carento" />
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link href="#">
                                                                <img src="/assets/imgs/blog/blog-list/cat.png" alt="Carento" />
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="sidebar-banner">
                                                <Link href="#">
                                                    <img className="rounded-3 w-100" src="/assets/imgs/blog/blog-list/banner-ads.png" alt="Carento" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                    {/* blog-1 */}
                    <section className="section-box box-news background-body">
                        <div className="container">
                            <div className="row align-items-end">
                                <div className="col-md-9 mb-30 wow fadeInUp">
                                    <h3 className="title-svg neutral-1000 mb-15">Upcoming Cars &amp; Events</h3>
                                    <p className="text-lg-medium text-bold neutral-500">Stay ahead with the latest car releases and upcoming events</p>
                                </div>
                                <div className="col-md-3 position-relative mb-30 wow fadeInUp">
                                    <div className="box-button-slider box-button-slider-team justify-content-end">
                                        <div className="swiper-button-prev swiper-button-prev-style-1 swiper-button-prev-2" tabIndex={0} role="button" aria-label="Previous slide" aria-controls="swiper-wrapper-f147def6ba09c37a">
                                            <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none">
                                                <path d="M7.99992 3.33325L3.33325 7.99992M3.33325 7.99992L7.99992 12.6666M3.33325 7.99992H12.6666" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <div className="swiper-button-next swiper-button-next-style-1 swiper-button-next-2" tabIndex={0} role="button" aria-label="Next slide" aria-controls="swiper-wrapper-f147def6ba09c37a">
                                            <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none">
                                                <path d="M7.99992 12.6666L12.6666 7.99992L7.99992 3.33325M12.6666 7.99992L3.33325 7.99992" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="box-list-news wow fadeInUp mt-5">
                                <div className="box-swiper">
                                    <Swiper {...swiperGroup3} className="swiper-container swiper-group-3">
                                        <div className="swiper-wrapper">
                                            <SwiperSlide className="swiper-slide pt-2">
                                                <div className="card-news background-card hover-up">
                                                    <div className="card-image">
                                                        <Link href="/blog-details">
                                                            <img src="/assets/imgs/blog/blog-1/img-1.png" alt="Carento" />
                                                        </Link>
                                                    </div>
                                                    <div className="card-info">
                                                        <Link className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold" href="/blog-grid">
                                                            News
                                                        </Link>
                                                        <div className="card-meta">
                                                            <span className="post-date neutral-1000">18 Sep 2024</span>
                                                            <span className="post-time neutral-1000">6 mins</span>
                                                            <span className="post-comment neutral-1000">38 comments</span>
                                                        </div>
                                                        <div className="card-title">
                                                            <Link className="text-xl-bold neutral-1000" href="/blog-details">
                                                                2025 Cadillac Escalade costs more money{" "}
                                                            </Link>
                                                        </div>
                                                        <div className="card-program">
                                                            <div className="endtime">
                                                                <div className="card-author">
                                                                    <img src="/assets/imgs/blog/blog-1/avatar-1.png" alt="Carento" />
                                                                    <p className="text-sm-bold neutral-1000">Jimmy Dave</p>
                                                                </div>
                                                                <div className="card-button">
                                                                    <Link className="btn btn-gray" href="/blog-details">
                                                                        Keep Reading
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </SwiperSlide>
                                            <SwiperSlide className="swiper-slide pt-2">
                                                <div className="card-news background-card hover-up">
                                                    <div className="card-image">
                                                        <Link href="/blog-details">
                                                            <img src="/assets/imgs/blog/blog-1/img-2.png" alt="Carento" />
                                                        </Link>
                                                    </div>
                                                    <div className="card-info">
                                                        <Link className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold" href="/blog-grid">
                                                            Trend
                                                        </Link>
                                                        <div className="card-meta">
                                                            <span className="post-date neutral-1000">18 Sep 2024</span>
                                                            <span className="post-time neutral-1000">6 mins</span>
                                                            <span className="post-comment neutral-1000">38 comments</span>
                                                        </div>
                                                        <div className="card-title">
                                                            <Link className="text-xl-bold neutral-1000" href="/blog-details">
                                                                2025 BMW 5 Series Review: A balanced luxury sedan
                                                            </Link>
                                                        </div>
                                                        <div className="card-program">
                                                            <div className="endtime">
                                                                <div className="card-author">
                                                                    <img src="/assets/imgs/blog/blog-1/avatar-2.png" alt="Carento" />
                                                                    <p className="text-sm-bold neutral-1000">Steven Job</p>
                                                                </div>
                                                                <div className="card-button">
                                                                    <Link className="btn btn-gray" href="/blog-details">
                                                                        Keep Reading
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </SwiperSlide>
                                            <SwiperSlide className="swiper-slide pt-2">
                                                <div className="card-news background-card hover-up">
                                                    <div className="card-image">
                                                        <Link href="/blog-details">
                                                            <img src="/assets/imgs/blog/blog-1/img-3.png" alt="Carento" />
                                                        </Link>
                                                    </div>
                                                    <div className="card-info">
                                                        <Link className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold" href="/blog-grid">
                                                            Discovery
                                                        </Link>
                                                        <div className="card-meta">
                                                            <span className="post-date neutral-1000">18 Sep 2024</span>
                                                            <span className="post-time neutral-1000">6 mins</span>
                                                            <span className="post-comment neutral-1000">38 comments</span>
                                                        </div>
                                                        <div className="card-title">
                                                            <Link className="text-xl-bold neutral-1000" href="/blog-details">
                                                                2025 Ruf Rodeo is ready to wrangle some rough roads
                                                            </Link>
                                                        </div>
                                                        <div className="card-program">
                                                            <div className="endtime">
                                                                <div className="card-author">
                                                                    <img src="/assets/imgs/blog/blog-1/avatar-3.png" alt="Carento" />
                                                                    <p className="text-sm-bold neutral-1000">David Jame</p>
                                                                </div>
                                                                <div className="card-button">
                                                                    <Link className="btn btn-gray" href="/blog-details">
                                                                        Keep Reading
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </SwiperSlide>
                                            <SwiperSlide className="swiper-slide pt-2">
                                                <div className="card-news background-card hover-up">
                                                    <div className="card-image">
                                                        <Link href="/blog-details">
                                                            <img src="/assets/imgs/blog/blog-1/img-1.png" alt="Carento" />
                                                        </Link>
                                                    </div>
                                                    <div className="card-info">
                                                        <Link className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold" href="/blog-grid">
                                                            News
                                                        </Link>
                                                        <div className="card-meta">
                                                            <span className="post-date neutral-1000">18 Sep 2024</span>
                                                            <span className="post-time neutral-1000">6 mins</span>
                                                            <span className="post-comment neutral-1000">38 comments</span>
                                                        </div>
                                                        <div className="card-title">
                                                            <Link className="text-xl-bold neutral-1000" href="/blog-details">
                                                                2025 Cadillac Escalade costs more money{" "}
                                                            </Link>
                                                        </div>
                                                        <div className="card-program">
                                                            <div className="endtime">
                                                                <div className="card-author">
                                                                    <img src="/assets/imgs/blog/blog-1/avatar-1.png" alt="Carento" />
                                                                    <p className="text-sm-bold neutral-1000">Jimmy Dave</p>
                                                                </div>
                                                                <div className="card-button">
                                                                    <Link className="btn btn-gray" href="/blog-details">
                                                                        Keep Reading
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </SwiperSlide>
                                            <SwiperSlide className="swiper-slide pt-2">
                                                <div className="card-news background-card hover-up">
                                                    <div className="card-image">
                                                        <Link href="/blog-details">
                                                            <img src="/assets/imgs/blog/blog-1/img-2.png" alt="Carento" />
                                                        </Link>
                                                    </div>
                                                    <div className="card-info">
                                                        <Link className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold" href="/blog-grid">
                                                            Trend
                                                        </Link>
                                                        <div className="card-meta">
                                                            <span className="post-date neutral-1000">18 Sep 2024</span>
                                                            <span className="post-time neutral-1000">6 mins</span>
                                                            <span className="post-comment neutral-1000">38 comments</span>
                                                        </div>
                                                        <div className="card-title">
                                                            <Link className="text-xl-bold neutral-1000" href="/blog-details">
                                                                2025 BMW 5 Series Review: A balanced luxury sedan
                                                            </Link>
                                                        </div>
                                                        <div className="card-program">
                                                            <div className="endtime">
                                                                <div className="card-author">
                                                                    <img src="/assets/imgs/blog/blog-1/avatar-2.png" alt="Carento" />
                                                                    <p className="text-sm-bold neutral-1000">Steven Job</p>
                                                                </div>
                                                                <div className="card-button">
                                                                    <Link className="btn btn-gray" href="/blog-details">
                                                                        Keep Reading
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </SwiperSlide>
                                            <SwiperSlide className="swiper-slide pt-2">
                                                <div className="card-news background-card hover-up">
                                                    <div className="card-image">
                                                        <Link href="/blog-details">
                                                            <img src="/assets/imgs/blog/blog-1/img-3.png" alt="Carento" />
                                                        </Link>
                                                    </div>
                                                    <div className="card-info">
                                                        <Link className="bg-2 rounded-12 position-absolute top-0 end-0 translate-middle-y px-3 py-2 me-4 text-sm-bold" href="/blog-grid">
                                                            Discovery
                                                        </Link>
                                                        <div className="card-meta">
                                                            <span className="post-date neutral-1000">18 Sep 2024</span>
                                                            <span className="post-time neutral-1000">6 mins</span>
                                                            <span className="post-comment neutral-1000">38 comments</span>
                                                        </div>
                                                        <div className="card-title">
                                                            <Link className="text-xl-bold neutral-1000" href="/blog-details">
                                                                2025 Ruf Rodeo is ready to wrangle some rough roads
                                                            </Link>
                                                        </div>
                                                        <div className="card-program">
                                                            <div className="endtime">
                                                                <div className="card-author">
                                                                    <img src="/assets/imgs/blog/blog-1/avatar-3.png" alt="Carento" />
                                                                    <p className="text-sm-bold neutral-1000">David Jame</p>
                                                                </div>
                                                                <div className="card-button">
                                                                    <Link className="btn btn-gray" href="/blog-details">
                                                                        Keep Reading
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </SwiperSlide>
                                        </div>
                                    </Swiper>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </Layout>
        </>
    );
}
