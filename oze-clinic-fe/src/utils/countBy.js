// Counts per value of a loaded list, with "" as the total: the numbers on StatusTabs buttons
export const countBy = (items, key = "status") => items.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] ?? 0) + 1, "": acc[""] + 1 }), { "": 0 });
