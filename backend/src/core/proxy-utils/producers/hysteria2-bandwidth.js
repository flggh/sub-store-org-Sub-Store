export function parseHysteria2Bandwidth(value, field) {
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
        return undefined;
    }
    const invalid = () =>
        new Error(
            `Invalid Hysteria2 ${field} bandwidth: ${value}. Expected a non-negative integer Mbps rate.`,
        );
    if (!['string', 'number'].includes(typeof value)) throw invalid();
    const matched = /^(\d+(?:\.\d+)?|\.\d+)(?:\s*([kKmMgGtT]?)([bB])ps)?$/.exec(
        `${value}`.trim(),
    );
    if (!matched) throw invalid();

    const powers = { '': -6, k: -3, m: 0, g: 3, t: 6 };
    const decimalPlaces = matched[1].split('.')[1]?.length ?? 0;
    const power =
        (matched[3] ? powers[matched[2].toLowerCase()] : 0) - decimalPlaces;
    let digits = matched[1].replace('.', '').replace(/^0+/, '');
    if (!digits) return 0;

    if (matched[3] === 'B') {
        let carry = 0;
        let product = '';
        for (let index = digits.length - 1; index >= 0; index--) {
            const digit = Number(digits[index]) * 8 + carry;
            product = String(digit % 10) + product;
            carry = Math.floor(digit / 10);
        }
        digits = (carry ? String(carry) : '') + product;
    }

    if (power < 0) {
        if (digits.length <= -power || /[1-9]/.test(digits.slice(power))) {
            throw invalid();
        }
        digits = digits.slice(0, power);
    } else {
        digits += '0'.repeat(power);
    }
    const mbps = Number(digits);
    if (!Number.isSafeInteger(mbps)) throw invalid();
    return mbps;
}
