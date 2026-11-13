import { useEffect, useRef, useState } from "react";

const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_FACTOR = 1.25;
const INITIAL_VIEW = { zoom: 1, x: 0, y: 0, rotation: 0 };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// State of the X-ray viewer, shared by its tool buttons (card head) and its stage (image area).
// Returns [stageRef, viewer]: put stageRef on the stage element, pass viewer to the tools and the stage.
// Zoom with buttons, wheel or double click, drag to pan, rotate, contrast, invert, full screen, image switch.
// Keys while the stage has focus: + / - zoom, 0 reset, R rotate, C contrast, I invert, F full screen, ← / → image.
const useXrayViewer = (images = []) => {
    const stageRef = useRef(null);
    const dragRef = useRef(null);
    const [index, setIndex] = useState(0);
    const [view, setView] = useState(INITIAL_VIEW);
    const [contrast, setContrast] = useState(false);
    const [invert, setInvert] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

    const count = images.length;
    const image = images[index];
    const hasImage = Boolean(image?.url);

    // Keeps the image from being dragged further than its zoomed edges.
    const limitOffset = (next) => {
        const box = stageRef.current?.getBoundingClientRect();
        if (!box) return next;
        const maxX = (box.width * (next.zoom - 1)) / 2;
        const maxY = (box.height * (next.zoom - 1)) / 2;
        return { ...next, x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
    };

    const zoomTo = (getZoom) =>
        setView((current) => {
            const zoom = clamp(getZoom(current.zoom), ZOOM_MIN, ZOOM_MAX);
            const ratio = zoom / current.zoom;
            return limitOffset({ ...current, zoom, x: current.x * ratio, y: current.y * ratio });
        });

    const zoomIn = () => zoomTo((zoom) => zoom * ZOOM_FACTOR);
    const zoomOut = () => zoomTo((zoom) => zoom / ZOOM_FACTOR);
    const rotate = (degrees) => setView((current) => ({ ...current, rotation: (current.rotation + degrees + 360) % 360 }));
    const toggleContrast = () => setContrast((on) => !on);
    const toggleInvert = () => setInvert((on) => !on);

    const reset = () => {
        setView(INITIAL_VIEW);
        setContrast(false);
        setInvert(false);
    };

    const goTo = (nextIndex) => {
        if (count === 0) return;
        setIndex((nextIndex + count) % count);
        setView(INITIAL_VIEW);
    };

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen?.();
            return;
        }
        // Focus the stage so the keyboard shortcuts keep working in full screen.
        stageRef.current?.requestFullscreen?.().then(() => stageRef.current?.focus());
    };

    useEffect(() => {
        const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    // Wheel zoom needs a non-passive listener to stop the page from scrolling.
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage || !hasImage) return undefined;
        const onWheel = (event) => {
            event.preventDefault();
            zoomTo((zoom) => (event.deltaY < 0 ? zoom * ZOOM_FACTOR : zoom / ZOOM_FACTOR));
        };
        stage.addEventListener("wheel", onWheel, { passive: false });
        return () => stage.removeEventListener("wheel", onWheel);
        // zoomTo only uses setView and the stage ref, so it doesn't need to re-bind.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasImage]);

    const endDrag = () => {
        dragRef.current = null;
        setDragging(false);
    };

    const stageHandlers = {
        onPointerDown: (event) => {
            if (!hasImage || view.zoom <= 1 || event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { startX: event.clientX, startY: event.clientY, x: view.x, y: view.y };
            setDragging(true);
        },
        onPointerMove: (event) => {
            const drag = dragRef.current;
            if (!drag) return;
            setView((current) => limitOffset({ ...current, x: drag.x + event.clientX - drag.startX, y: drag.y + event.clientY - drag.startY }));
        },
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
        onDoubleClick: () => hasImage && zoomTo((zoom) => (zoom > 1 ? 1 : 2)),
        onKeyDown: (event) => {
            if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return;
            const actions = {
                "+": zoomIn,
                "=": zoomIn,
                "-": zoomOut,
                0: reset,
                r: () => rotate(90),
                c: toggleContrast,
                i: toggleInvert,
                f: toggleFullscreen,
                ArrowLeft: () => goTo(index - 1),
                ArrowRight: () => goTo(index + 1),
            };
            const action = actions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
            if (!action || (!hasImage && !event.key.startsWith("Arrow"))) return;
            event.preventDefault();
            action();
        },
    };

    // The ref is returned on its own: an object holding a ref can't be read during render.
    const viewer = {
        stageHandlers,
        index,
        count,
        image,
        hasImage,
        view,
        contrast,
        invert,
        dragging,
        fullscreen,
        canZoomIn: view.zoom < ZOOM_MAX,
        canZoomOut: view.zoom > ZOOM_MIN,
        zoomIn,
        zoomOut,
        rotate,
        toggleContrast,
        toggleInvert,
        reset,
        goTo,
        toggleFullscreen,
    };

    return [stageRef, viewer];
};

export default useXrayViewer;
