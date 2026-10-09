export const ROUTES = {
    HOME: "/",
    SIGN_IN: "/login",
    REGISTER: "/register",
    ABOUT_US: "/about-us",
    // TODO(spec): Forgot Password screen is not built yet; its route is not registered.
    FORGOT_PASSWORD: "/forgot-password",
};

// TODO(spec): BR-001/UC-04 say Home Page, the screen flow says Patient Dashboard, and staff
// destinations are not defined. The role source is also not defined in the login response.
// eslint-disable-next-line no-unused-vars
export const getPostLoginRoute = (role) => ROUTES.HOME;
