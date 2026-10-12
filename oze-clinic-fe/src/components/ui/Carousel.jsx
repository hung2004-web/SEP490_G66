import { Children, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/utils/cx";

const EDGE_TOLERANCE_PX = 2;

const GAPS = {
    normal: { track: "-mx-3", slide: "px-3" },
    wide: { track: "-mx-4 md:-mx-6", slide: "px-4 md:px-6" },
};

const ARROW_CLASS = "btn btn-primary absolute top-1/2 z-10 size-11 -translate-y-1/2 rounded-full p-0 shadow-md";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Carousel = ({ label, previousLabel, nextLabel, gap = "normal", children }) => {
    const trackRef = useRef(null);

    const scrollByPage = (direction) => {
        const track = trackRef.current;
        const maxScroll = track.scrollWidth - track.clientWidth;
        const behavior = prefersReducedMotion() ? "auto" : "smooth";
        if (direction > 0 && track.scrollLeft >= maxScroll - EDGE_TOLERANCE_PX) {
            track.scrollTo({ left: 0, behavior });
            return;
        }
        if (direction < 0 && track.scrollLeft <= EDGE_TOLERANCE_PX) {
            track.scrollTo({ left: maxScroll, behavior });
            return;
        }
        track.scrollBy({ left: direction * track.clientWidth, behavior });
    };

    return (
        <div className="relative">
            <button
                type="button"
                className={cx(ARROW_CLASS, "left-2 carousel:-left-21")}
                aria-label={previousLabel}
                onClick={() => scrollByPage(-1)}
            >
                <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <ul
                ref={trackRef}
                tabIndex={0}
                aria-label={label}
                className={cx("flex snap-x snap-mandatory overflow-x-auto py-2 scrollbar-none", GAPS[gap].track)}
            >
                {Children.map(children, (child) => (
                    <li className={cx("flex shrink-0 basis-full snap-start md:basis-1/2 lg:basis-1/4", GAPS[gap].slide)}>
                        {child}
                    </li>
                ))}
            </ul>
            <button
                type="button"
                className={cx(ARROW_CLASS, "right-2 carousel:-right-21")}
                aria-label={nextLabel}
                onClick={() => scrollByPage(1)}
            >
                <ChevronRight className="size-5" aria-hidden="true" />
            </button>
        </div>
    );
};

export default Carousel;
