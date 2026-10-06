export const ROUTES = {
    HOME: "/",
    SIGN_IN: "/sign-in",
    // TODO(spec): Sign Up and Forgot Password screens are not built yet; these routes are not registered.
    SIGN_UP: "/sign-up",
    FORGOT_PASSWORD: "/forgot-password",
};

// System Messages (SRS Report 3), word for word.
export const MESSAGES = {
    MSG07: "Please enter [field name].",
    MSG24: "Wrong password.",
    MSG26: "Account has been temporarily locked due to 5 consecutive failed login attempts.",
};

// TODO(spec): BR-001/UC-04 say Home Page, the screen flow says Patient Dashboard, and staff
// destinations are not defined. The role source is also not defined in the login response.
// eslint-disable-next-line no-unused-vars
export const getPostLoginRoute = (role) => ROUTES.HOME;
