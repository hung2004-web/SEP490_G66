import { Component } from "react";
import { Navigate } from "react-router-dom";
import { getErrorRoute } from "../../utils/routes";

// Catches render errors in the page below it and goes to the 500 page (outside the layout) instead of a blank screen.
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
        if (this.state.hasError) return <Navigate to={getErrorRoute(500)} replace />;
        return this.props.children;
    }
}

export default ErrorBoundary;
