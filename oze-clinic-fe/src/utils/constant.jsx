export const ROUTES = {
    HOME: "/",
    SIGN_IN: "/login",
    REGISTER: "/register",
    // TODO(spec): Forgot Password screen is not built yet; its route is not registered.
    FORGOT_PASSWORD: "/forgot-password",
};

// System Messages (SRS Report 3), Vietnamese texts from the Sign In spec (section 3b), word for word.
export const MESSAGES = {
    MSG07: "Vui lòng nhập [tên trường].",
    MSG24: "Sai mật khẩu.",
    MSG26: "Tài khoản đã bị tạm khóa do đăng nhập sai 5 lần liên tiếp.",
};

// TODO(spec): BR-001/UC-04 say Home Page, the screen flow says Patient Dashboard, and staff
// destinations are not defined. The role source is also not defined in the login response.
// eslint-disable-next-line no-unused-vars
export const getPostLoginRoute = (role) => ROUTES.HOME;
