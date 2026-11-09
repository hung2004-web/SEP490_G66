// Bottom bar of an exam step: a short status on the left ("Tự động lưu nháp"), the step's buttons on the right.
const StepActionBar = ({ status, children }) => (
    <div className="card-app sticky bottom-0 z-10 flex flex-wrap items-center gap-3 px-5 py-3.5">
        <p className="mr-auto min-w-0 text-caption text-muted" aria-live="polite">
            {status}
        </p>
        {children}
    </div>
);

export default StepActionBar;
