// "Dịch vụ đăng ký" strip under the patient's name. services: [{ id, name }] or plain strings.
const ServiceChips = ({ services = [] }) => {
    if (services.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-primary-soft px-4 py-2.5">
            <span className="mr-1 text-caption font-semibold text-primary">Dịch vụ đăng ký</span>
            <ul className="contents">
                {services.map((service) => {
                    const name = typeof service === "string" ? service : service.name;
                    return (
                        <li key={service.id ?? name} className="rounded-md bg-canvas px-2.5 py-0.5 text-caption font-medium text-ink shadow-sm">
                            {name}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default ServiceChips;
