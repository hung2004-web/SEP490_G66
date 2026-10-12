const SectionHeading = ({ id, children }) => {
    return (
        <div className="flex flex-col items-center">
            <h2 id={id} className="text-center font-heading text-display-section text-ink">
                {children}
            </h2>
            <div aria-hidden="true" className="mt-4 flex w-60 max-w-3/5 items-center gap-2">
                <span className="h-0.5 flex-1 bg-primary" />
                <span className="size-2 rotate-45 bg-primary" />
                <span className="h-0.5 flex-1 bg-primary" />
            </div>
        </div>
    );
};

export default SectionHeading;
