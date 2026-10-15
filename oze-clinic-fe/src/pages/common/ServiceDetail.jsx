import { Quote } from "lucide-react";
import { useParams } from "react-router-dom";
import Breadcrumb from "@/components/navigation/Breadcrumb";
import SectionHeading from "@/components/ui/SectionHeading";
import useAsync from "@/hooks/useAsync";
import GlobalException from "@/pages/globalException/GlobalException";
import { getServiceDetail } from "@/services/dentalService";
import { ROUTES } from "@/utils/routes";

const SECTION_CLASS = "container-public flex flex-col gap-10 py-12 md:py-16";

const BENEFITS_TITLE_ID = "service-benefits-title";
const STEPS_TITLE_ID = "service-steps-title";
const FEEDBACKS_TITLE_ID = "service-feedbacks-title";

const ServiceDetailSkeleton = () => (
    <div className="container-public flex flex-col gap-10 py-12 md:py-16" aria-hidden="true">
        <div className="skeleton mx-auto h-10 w-2/3 max-w-md" />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="skeleton aspect-4/3" />
            <div className="skeleton h-40" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
                <div key={index} className="skeleton h-24" />
            ))}
        </div>
    </div>
);

const BenefitsSection = ({ benefits }) => (
    <section aria-labelledby={BENEFITS_TITLE_ID} className={SECTION_CLASS}>
        <SectionHeading id={BENEFITS_TITLE_ID}>Lợi ích sau điều trị</SectionHeading>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {benefits.map(({ number, icon: Icon, description }) => (
                <li key={number} className="card-public card-hover flex overflow-hidden p-0">
                    <span className="flex w-20 shrink-0 items-center justify-center bg-primary-soft text-primary md:w-24">
                        <Icon className="size-8" aria-hidden="true" />
                    </span>
                    <p className="flex flex-1 items-center p-5 text-body-md text-body">{description}</p>
                </li>
            ))}
        </ul>
    </section>
);

const StepsSection = ({ steps }) => (
    <section aria-labelledby={STEPS_TITLE_ID} className={SECTION_CLASS}>
        <SectionHeading id={STEPS_TITLE_ID}>Quy trình điều trị</SectionHeading>
        <ol className="grid grid-cols-2 gap-y-10 sm:grid-cols-3 md:flex md:justify-center">
            {steps.map(({ step, icon: Icon }, index) => (
                <li key={step} className="relative flex flex-col items-center gap-4 md:flex-1">
                    {/* Connector to the next step, only when the steps sit on one row. */}
                    {index < steps.length - 1 && (
                        <span
                            aria-hidden="true"
                            className="absolute left-1/2 top-12 hidden h-0.5 w-full bg-primary-soft md:block"
                        />
                    )}
                    <span className="relative flex size-24 items-center justify-center rounded-full border-4 border-primary bg-canvas text-primary shadow-md">
                        <Icon className="size-10" aria-hidden="true" />
                        <span className="num absolute -right-1 -top-1 flex size-8 items-center justify-center rounded-full bg-primary text-label text-on-primary">
                            {step}
                        </span>
                    </span>
                    <span className="text-title text-ink">Bước {step}</span>
                </li>
            ))}
        </ol>
    </section>
);

const FeedbacksSection = ({ feedbacks, serviceName }) => (
    <section aria-labelledby={FEEDBACKS_TITLE_ID} className={SECTION_CLASS}>
        <SectionHeading id={FEEDBACKS_TITLE_ID}>Phản hồi của khách hàng</SectionHeading>
        <ul className="flex flex-col gap-8">
            {feedbacks.map(({ id, imageUrl, content }) => (
                <li key={id} className="card-public grid grid-cols-1 items-center gap-6 p-6 md:grid-cols-2 md:gap-10 md:p-8">
                    <img
                        src={imageUrl}
                        alt={`Khách hàng sau điều trị ${serviceName}`}
                        loading="lazy"
                        className="aspect-4/3 w-full rounded-xl bg-surface-tint object-contain"
                    />
                    <blockquote className="flex flex-col gap-4">
                        <Quote className="size-8 text-primary" aria-hidden="true" />
                        <p className="text-body-lg text-body">{content}</p>
                    </blockquote>
                </li>
            ))}
        </ul>
    </section>
);

const ServiceDetail = () => {
    const { serviceId } = useParams();
    const { loading, value } = useAsync(() => getServiceDetail(serviceId), [serviceId]);

    if (loading) return <ServiceDetailSkeleton />;
    if (!value?.success) return <GlobalException code={404} />;

    const service = value.data;
    const breadcrumbItems = [
        { label: "Trang chủ", href: ROUTES.HOME },
        { label: "Dịch vụ", href: ROUTES.SERVICES },
        { label: service.name },
    ];

    return (
        <div className="bg-canvas">
            <div className="container-public pb-6 pt-3">
                <Breadcrumb items={breadcrumbItems} />
            </div>

            {/* Service name, image and description */}
            <section className="container-public flex flex-col gap-10 pb-12 md:pb-16">
                <h1 className="text-center font-heading text-display-section text-ink">{service.name}</h1>
                <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
                    <img
                        src={service.imageUrl}
                        alt={service.name}
                        className="aspect-4/3 w-full rounded-2xl bg-surface-tint object-contain shadow-md"
                    />
                    <p className="text-body-lg text-body">{service.description}</p>
                </div>
            </section>

            <div className="bg-surface-tint">
                <BenefitsSection benefits={service.benefits} />
            </div>
            <StepsSection steps={service.treatmentSteps} />
            <div className="bg-surface-tint">
                <FeedbacksSection feedbacks={service.feedbacks} serviceName={service.name} />
            </div>
        </div>
    );
};

export default ServiceDetail;
