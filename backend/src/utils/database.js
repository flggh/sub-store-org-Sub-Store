export function findByName(list, name, field = 'name') {
    if (!Array.isArray(list)) return undefined;
    return list.find((item) => item[field] === name);
}

export function findIndexByName(list, name, field = 'name') {
    if (!Array.isArray(list)) return -1;
    return list.findIndex((item) => item[field] === name);
}

export function deleteByName(list, name, field = 'name') {
    const idx = findIndexByName(list, name, field);
    if (idx !== -1) list.splice(idx, 1);
}

export function updateByName(list, name, newItem, field = 'name') {
    const idx = findIndexByName(list, name, field);
    if (idx !== -1) list[idx] = newItem;
}
