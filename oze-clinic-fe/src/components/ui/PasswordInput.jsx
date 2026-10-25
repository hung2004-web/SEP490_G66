import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Password input with a show / hide button. Takes the same props as <input> (id, value, onChange, aria-*...).
const PasswordInput = ({ className = "", ...props }) => {
    const [visible, setVisible] = useState(false);
    const label = visible ? "Ẩn mật khẩu" : "Hiện mật khẩu";
    const Icon = visible ? EyeOff : Eye;

    return (
        <div className="relative">
            <input {...props} type={visible ? "text" : "password"} className={`input pr-11 ${className}`} />
            <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-md text-muted hover:text-ink"
                aria-label={label}
                aria-pressed={visible}
                title={label}
                onClick={() => setVisible((current) => !current)}
            >
                <Icon className="size-4" aria-hidden="true" />
            </button>
        </div>
    );
};

export default PasswordInput;
