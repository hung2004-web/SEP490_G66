import React from 'react';
import { Link } from 'react-router-dom';
import { cx } from '../../utils/cx';

/**
 * Breadcrumb component
 * @param {Array} items - Array of objects { label: string, href?: string }
 * @param {string} className - Optional additional class names
 */
const Breadcrumb = ({ items = [], className }) => {
    return (
        <nav aria-label="Breadcrumb" className={cx("breadcrumb", className)}>
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <React.Fragment key={index}>
                        {isLast ? (
                            <span aria-current="page">
                                {item.label}
                            </span>
                        ) : (
                            <>
                                {item.href ? (
                                    <Link to={item.href} className="hover:text-primary transition-colors">
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span>{item.label}</span>
                                )}
                                <span className="mx-1 text-placeholder">/</span>
                            </>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

export default Breadcrumb;
