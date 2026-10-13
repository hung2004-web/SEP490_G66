import { Component } from "react";
import GlobalException from "../../pages/globalException/GlobalException";

// Catches render errors in the page below it and shows the 500 page instead of a blank screen.
// Give it key={pathname} so moving to another page resets it.
class ErrorBoundary extends Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error("Unhandled render error:", error, info.componentStack);
    }

    render() {
        if (this.state.hasError) return <GlobalException code={500} />;
        return this.props.children;
    }
}

export default ErrorBoundary;
