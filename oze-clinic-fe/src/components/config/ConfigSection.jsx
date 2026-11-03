import { RotateCcw } from "lucide-react";
import { cx } from "@/utils/cx";
import ConfigValueInput from "./ConfigValueInput";

// One group of system settings ("Đặt lịch hẹn", "Check-in", ...) as a table: name, value field, undo button.
// configs: [{ key, label, dataType, unit?, min?, max? }]; values / savedValues: { [key]: string } (what is typed / what is stored);
// errors: { [key]: message }; onChange(key, value); onRevert(key) puts back the stored value.
const ConfigSection = ({ title, configs, values, savedValues, errors = {}, onChange, onRevert }) => (
    <section className="card-app overflow-hidden p-0" aria-label={title}>
        <h2 className="card-title border-b border-border px-5 py-4">{title}</h2>
        <table className="table">
            <thead>
                <tr>
                    <th scope="col">Cấu hình</th>
                    <th scope="col" className="w-64">
                        Giá trị
                    </th>
                    <th scope="col" className="w-14">
                        <span className="sr-only">Hoàn tác</span>
                    </th>
                </tr>
            </thead>
            <tbody>
                {configs.map((config) => {
                    const id = `config-${config.key}`;
                    const changed = values[config.key] !== savedValues[config.key];
                    const error = errors[config.key];
                    return (
                        <tr key={config.key} className={cx(changed && "bg-primary-softer")}>
                            <th scope="row" className="text-left font-normal">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium text-ink">{config.label}</span>
                                    {changed && <span className="badge badge-info">Đã sửa</span>}
                                </span>
                            </th>
                            <td className="py-2">
                                <ConfigValueInput
                                    id={id}
                                    config={config}
                                    value={values[config.key]}
                                    onChange={(value) => onChange(config.key, value)}
                                    invalid={Boolean(error)}
                                    describedBy={error ? `${id}-error` : undefined}
                                />
                                {error && (
                                    <p id={`${id}-error`} className="error-text mt-1">
                                        {error}
                                    </p>
                                )}
                            </td>
                            <td className="text-right">
                                {changed && (
                                    <button
                                        type="button"
                                        className="btn btn-icon size-8 hover:bg-surface-tint"
                                        aria-label={`Hoàn tác ${config.label}`}
                                        title="Hoàn tác"
                                        onClick={() => onRevert(config.key)}
                                    >
                                        <RotateCcw className="size-4" aria-hidden="true" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </section>
);

export default ConfigSection;
