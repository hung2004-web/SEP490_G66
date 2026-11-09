// "Dịch vụ đăng ký" strip under the patient's name. services: [{ id, name }] or plain strings.
const ServiceChips = ({ services = [] }) => {
    if (services.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] bg-primary-soft px-4 py-3">
            <span className="text-caption font-semibold text-primary">Dịch vụ đăng ký</span>
            <ul className="contents">
                {services.map((service) => {
                    const name = typeof service === "string" ? service : service.name;
                    return (
                        <li key={service.id ?? name} className="rounded-full border border-border bg-canvas px-2.5 py-1 text-caption font-medium text-ink">
                            {name}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default ServiceChips;
