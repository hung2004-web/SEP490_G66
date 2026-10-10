export const ROUTES = {
    HOME: "/",
    SIGN_IN: "/login",
    REGISTER: "/register",
    ABOUT_US: "/about-us",
    FORGOT_PASSWORD: "/forgot-password",
    VERIFY_OTP: "/verify-otp",
    RESET_PASSWORD: "/reset-password",
};

// TODO(spec): BR-001/UC-04 say Home Page, the screen flow says Patient Dashboard, and staff
// destinations are not defined. The role source is also not defined in the login response.
// eslint-disable-next-line no-unused-vars
export const getPostLoginRoute = (role) => ROUTES.HOME;
