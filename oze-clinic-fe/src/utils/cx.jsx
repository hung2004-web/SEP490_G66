// Joins class names, skipping falsy values: cx("btn", isLarge && "btn-lg").
export const cx = (...classes) => classes.filter(Boolean).join(" ");
