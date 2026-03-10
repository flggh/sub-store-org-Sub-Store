export function splitKeyValuePair(pair) {
    const index = pair.indexOf('=');
    return index === -1
        ? [pair, undefined]
        : [pair.slice(0, index), pair.slice(index + 1)];
}

export function safeDecodeURIComponent(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export function parseBooleanStyleArgs(input) {
    const parsed = {};
    for (const pair of input.split('&')) {
        if (!pair) continue;
        const [key, value] = splitKeyValuePair(pair);
        parsed[key] =
            value == null || value === '' ? true : safeDecodeURIComponent(value);
    }
    return parsed;
}

export function parseArgumentString(input) {
    const parsed = {};
    for (const pair of input.split('&')) {
        if (!pair) continue;
        const [key, value] = splitKeyValuePair(pair);
        parsed[key] = value == null || value === '' ? true : value;
    }
    return parsed;
}
