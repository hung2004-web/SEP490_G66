// Bottom bar of an exam step: a short status on the left ("Tự động lưu nháp"), the step's buttons on the right.
// The buttons stay together: when space runs out they wrap as a group, right-aligned, under the status.
const StepActionBar = ({ status, children }) => (
    <div className="card-app sticky bottom-0 z-10 flex flex-wrap items-center gap-3 px-5 py-3.5">
        <p className="min-w-24 flex-1 text-caption text-muted" aria-live="polite">
            {status}
        </p>
        <div className="ml-auto flex flex-wrap justify-end gap-3">{children}</div>
    </div>
);

export default StepActionBar;
