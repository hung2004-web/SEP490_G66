import useXrayViewer from "@/hooks/useXrayViewer";
import XrayViewerStage from "./XrayViewerStage";
import XrayViewerTools from "./XrayViewerTools";

// X-ray result being reviewed, laid out as the Figma card 532:4575: title and viewer tools in the head, image below.
// title: "X-quang toàn cảnh · YC000318"; subtitle: "Chỉ định 08:40 · Chụp xong 08:58 bởi KTV. …";
// typeLabel: "X-quang toàn cảnh"; images: [{ id, url? }]. Without url a placeholder is shown.
const ImagingResultCard = ({ title, subtitle, typeLabel, images = [] }) => {
    const [stageRef, viewer] = useXrayViewer(images);

    return (
        <section className="card-app overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-body-md font-semibold text-ink">{title}</h3>
                    {subtitle && <p className="text-caption text-muted">{subtitle}</p>}
                </div>
                <XrayViewerTools viewer={viewer} />
            </div>
            <div className="h-px bg-border" />
            <div className="px-5 pt-4 pb-5">
                <XrayViewerStage stageRef={stageRef} viewer={viewer} images={images} label={typeLabel} />
            </div>
        </section>
    );
};

export default ImagingResultCard;
