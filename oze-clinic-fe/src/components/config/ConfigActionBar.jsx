// Bar under the settings with "Huỷ thay đổi" and "Lưu cấu hình"; both are off while nothing has changed.
// It sticks to the bottom of the screen so the buttons stay in reach on a long page.
const ConfigActionBar = ({ hasChanges, saving = false, onDiscard, onSave }) => (
    <div className="card-app sticky bottom-4 z-10 flex justify-end gap-2 px-5 py-3 shadow-md">
        <button type="button" className="btn btn-secondary" disabled={!hasChanges || saving} onClick={onDiscard}>
            Huỷ thay đổi
        </button>
        <button type="button" className="btn btn-primary" disabled={!hasChanges || saving} onClick={onSave}>
            Lưu cấu hình
        </button>
    </div>
);

export default ConfigActionBar;
