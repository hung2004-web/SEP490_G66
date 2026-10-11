import { Children, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const EDGE_TOLERANCE_PX = 2;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Carousel = ({ label, previousLabel, nextLabel, header, children }) => {
    const trackRef = useRef(null);
    const [edges, setEdges] = useState({ atStart: true, atEnd: true });

    useEffect(() => {
        const track = trackRef.current;
        const update = () => {
            const maxScroll = track.scrollWidth - track.clientWidth;
            const atStart = track.scrollLeft <= EDGE_TOLERANCE_PX;
            const atEnd = track.scrollLeft >= maxScroll - EDGE_TOLERANCE_PX;
            setEdges((current) =>
                current.atStart === atStart && current.atEnd === atEnd ? current : { atStart, atEnd },
            );
        };
        const observer = new ResizeObserver(update);
        observer.observe(track);
        track.addEventListener("scroll", update, { passive: true });
        return () => {
            observer.disconnect();
            track.removeEventListener("scroll", update);
        };
    }, []);

    const scrollByPage = (direction, atEdge) => {
        if (atEdge) return;
        const track = trackRef.current;
        track.scrollBy({ left: direction * track.clientWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    };

    return (
        <div>
            <div className="mb-6 flex items-end justify-between gap-4">
                {header}
                <div className="flex shrink-0 gap-2">
                    <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        aria-label={previousLabel}
                        aria-disabled={edges.atStart || undefined}
                        onClick={() => scrollByPage(-1, edges.atStart)}
                    >
                        <ChevronLeft className="size-5" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        aria-label={nextLabel}
                        aria-disabled={edges.atEnd || undefined}
                        onClick={() => scrollByPage(1, edges.atEnd)}
                    >
                        <ChevronRight className="size-5" aria-hidden="true" />
                    </button>
                </div>
            </div>
            <ul
                ref={trackRef}
                tabIndex={0}
                aria-label={label}
                className="-mx-3 flex snap-x snap-mandatory overflow-x-auto py-2"
            >
                {Children.map(children, (child) => (
                    <li className="flex shrink-0 basis-full snap-start px-3 md:basis-1/2 lg:basis-1/4">{child}</li>
                ))}
            </ul>
        </div>
    );
};

export default Carousel;
