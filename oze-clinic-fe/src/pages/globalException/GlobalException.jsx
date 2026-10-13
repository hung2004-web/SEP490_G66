import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Exception } from "../../utils/globalException";
import { CLINIC_EMAIL, CLINIC_HOTLINE } from "../../utils/messages";
import { ROUTES } from "../../utils/routes";

const DEFAULT_CODE = 404;

const findException = (code) =>
    Exception.find((item) => item.code === Number(code)) ??
    Exception.find((item) => item.code === DEFAULT_CODE);

// Shows a global error by HTTP code: from the `code` prop (catch-all route) or the /error/:code param.
// Unknown codes fall back to 404.
const GlobalException = ({ code }) => {
    const params = useParams();
    const navigate = useNavigate();
    const error = findException(code ?? params.code);

    useEffect(() => {
        document.title = `${error.code} - ${error.title}`;
    }, [error]);

    // No previous page in this tab (e.g. opened from a link): go home instead.
    const handleBack = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate(ROUTES.HOME);
    };

    return (
        <div className="bg-surface-tint">
            <section className="container-public py-12 md:py-16">
                <div className="card-public mx-auto max-w-2xl md:p-12">
                    <span className="inline-block rounded-full bg-danger-soft px-3 py-1 text-label text-danger">
                        {error["label-status"]}
                    </span>

                    <h1 className="mt-4 text-heading-1 text-ink md:text-display-md">
                        <span className="num">{error.code}</span> - {error.title}
                    </h1>

                    <h2 className="mt-8 text-heading-2 text-ink">Thông tin về lỗi</h2>
                    <p className="mt-3 text-body-md text-body">{error.message}</p>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <button type="button" onClick={handleBack} className="btn btn-primary">
                            Quay lại
                        </button>
                        <Link to={ROUTES.HOME} className="btn btn-secondary">
                            Về trang chủ
                        </Link>
                    </div>

                    <hr className="my-8 border-border" />

                    <p className="text-body-md text-body">
                        Cần hỗ trợ gấp? Liên hệ số điện thoại:{" "}
                        <a href={`tel:${CLINIC_HOTLINE.TEL}`} className="num font-semibold text-primary underline-offset-4 hover:underline">
                            {CLINIC_HOTLINE.DISPLAY}
                        </a>{" "}
                        hoặc email:{" "}
                        <a href={`mailto:${CLINIC_EMAIL}`} className="font-semibold text-primary underline-offset-4 hover:underline">
                            {CLINIC_EMAIL}
                        </a>{" "}
                        để nhận hỗ trợ.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default GlobalException;
