import _ from 'lodash';
import YAML from '@/utils/yaml';

export class Result {
    constructor(proxy) {
        this.proxy = proxy;
        this.output = [];
    }

    append(data) {
        if (typeof data === 'undefined') {
            throw new Error('required field is missing');
        }
        this.output.push(data);
    }

    appendIfPresent(data, attr) {
        if (isPresent(this.proxy, attr)) {
            this.append(data);
        }
    }

    toString() {
        return this.output.join('');
    }
}

export function isPresent(obj, attr) {
    const data = _.get(obj, attr);
    return typeof data !== 'undefined' && data !== null;
}

export function normalizePluginMuxValue(mux) {
    if (typeof mux === 'boolean') return Number(mux);
    if (typeof mux === 'string') {
        const normalized = mux.trim().toLowerCase();
        if (normalized === 'true') return 1;
        if (normalized === 'false') return 0;
        if (/^\d+$/.test(normalized)) return parseInt(normalized, 10);
    }
    return mux;
}

export function produceProxyListOutput(list, type, opts = {}) {
    if (type === 'internal') return list;

    const prettyYaml = opts.prettyYaml ?? opts['pretty-yaml'];
    // 仅当显式传入 false / "false" 时才使用 JSON 行格式
    const useJson =
        prettyYaml === false ||
        prettyYaml === 'false' ||
        prettyYaml === '0';

    if (useJson) {
        return 'proxies:\n' +
            list.map((proxy) => '  - ' + JSON.stringify(proxy) + '\n').join('');
    }

    return YAML.safeDump(
        {
            proxies: list,
        },
        {
            lineWidth: -1,
        },
    );
}
