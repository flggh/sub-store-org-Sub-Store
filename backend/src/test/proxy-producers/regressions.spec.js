import { expect } from 'chai';

import $ from '@/core/app';
import { ProxyUtils } from '@/core/proxy-utils';
import { UUID, produceExternal, produceInternal } from './helpers';

function captureProduction(proxies, platform, type = 'internal') {
    const originalError = $.error;
    const errors = [];
    $.error = (message) => errors.push(String(message));
    try {
        return { output: ProxyUtils.produce(proxies, platform, type), errors };
    } finally {
        $.error = originalError;
    }
}

describe('Proxy producer regressions', function () {
    const shadowsocks = {
        type: 'ss',
        name: 'SS',
        server: 'example.com',
        port: 443,
        cipher: 'aes-128-gcm',
        password: 'secret',
    };

    for (const platform of ['Loon', 'Surge', 'Surfboard', 'QX']) {
        it(`rejects missing ${platform} obfs plugin options with a useful error`, function () {
            const { output, errors } = captureProduction(
                [{ ...shadowsocks, plugin: 'obfs' }],
                platform,
                'external',
            );
            expect(output).to.equal('');
            expect(errors.join('\n')).to.include('requires plugin-opts');
        });

        it(`preserves valid ${platform} obfs plugin options`, function () {
            const output = produceExternal(platform, {
                ...shadowsocks,
                plugin: 'obfs',
                'plugin-opts': {
                    mode: 'http',
                    host: 'front.example',
                    path: '/tunnel',
                },
            });
            expect(output).to.include('obfs-host=front.example');
            expect(output).to.include('obfs-uri=/tunnel');
        });
    }

    it('emits one Loon WireGuard keepalive and preserves an explicit zero', function () {
        const output = produceExternal('Loon', {
            type: 'wireguard',
            name: 'WG',
            server: 'example.com',
            port: 51820,
            'private-key': 'private==',
            'public-key': 'public==',
            ip: '10.0.0.2',
            'persistent-keepalive': 0,
            keepalive: 25,
        });
        expect(output.match(/keepalive=/g)).to.have.length(1);
        expect(output).to.include('keepalive=0');
    });

    for (const wsOptions of [
        undefined,
        null,
        {},
        { headers: {} },
        { headers: { 'User-Agent': 'client' } },
    ]) {
        it(`handles sing-box WS options without a Host: ${JSON.stringify(
            wsOptions,
        )}`, function () {
            const [output] = produceInternal('sing-box', {
                type: 'vmess',
                name: 'VMess',
                server: 'example.com',
                port: 443,
                uuid: UUID,
                cipher: 'auto',
                network: 'ws',
                'ws-opts': wsOptions,
            });
            expect(output.transport.type).to.equal('ws');
        });
    }

    it('preserves the port in sing-box WebSocket Host headers', function () {
        const [output] = produceInternal('sing-box', {
            type: 'vmess',
            name: 'VMess',
            server: 'example.com',
            port: 443,
            uuid: UUID,
            cipher: 'auto',
            network: 'ws',
            'ws-opts': { headers: { Host: 'front.example:8443' } },
        });
        expect(output.transport.headers.Host).to.equal('front.example:8443');
    });

    for (const type of ['ss', 'trojan', 'vless']) {
        for (const alpn of ['h2,http/1.1', ['h2', 'http/1.1']]) {
            it(`preserves URI ALPN for ${type} as ${JSON.stringify(
                alpn,
            )}`, function () {
                const output = produceExternal('URI', {
                    ...shadowsocks,
                    type,
                    uuid: UUID,
                    alpn,
                });
                expect(new URL(output).searchParams.get('alpn')).to.equal(
                    'h2,http/1.1',
                );
            });
        }
    }

    for (const type of ['ss', 'trojan']) {
        it(`preserves the parsed H2 Host in ${type} share links`, function () {
            const output = produceExternal('URI', {
                ...shadowsocks,
                type,
                network: 'h2',
                'h2-opts': {
                    path: '/h2',
                    headers: { host: ['front.example'] },
                },
            });
            expect(new URL(output).searchParams.get('host')).to.equal(
                'front.example',
            );
        });
    }

    it('percent-encodes reserved characters in Trojan URI passwords', function () {
        const password = 'literal%2F:@#?=中文';
        const output = produceExternal('URI', {
            ...shadowsocks,
            type: 'trojan',
            password,
        });
        expect(decodeURIComponent(new URL(output).username)).to.equal(password);
    });

    const trojan = {
        type: 'trojan',
        name: 'Egern Trojan',
        server: 'example.com',
        port: 443,
        password: 'secret',
        tls: true,
        prev_hop: 'chain',
        next_hop: 'legacy',
    };

    for (const network of ['h2', 'grpc']) {
        it(`matches the upstream Egern Trojan allowlist for ${network}`, function () {
            const { output } = captureProduction(
                [{ ...trojan, network }],
                'Egern',
            );
            expect(output).to.deep.equal([]);
        });
    }

    it('retains HTTP transport fields for the upstream-allowed Egern Trojan HTTP network', function () {
        const [output] = produceInternal('Egern', {
            ...trojan,
            network: 'http',
            'http-opts': {
                method: 'GET',
                path: ['/tunnel'],
                headers: { Host: ['front.example'] },
            },
        });
        expect(output.trojan.transport.http1).to.include({
            method: 'GET',
            path: '/tunnel',
        });
        expect(output.trojan.transport.http1.headers).to.deep.equal({
            Host: 'front.example',
        });
    });

    for (const type of ['vmess', 'vless']) {
        for (const network of ['http', 'h2']) {
            it(`retains upstream Egern ${type} ${network} support`, function () {
                const [output] = produceInternal('Egern', {
                    ...trojan,
                    type,
                    uuid: UUID,
                    cipher: 'auto',
                    network,
                    [`${network}-opts`]: {
                        path: '/tunnel',
                        host: ['front.example'],
                        headers: { Host: ['front.example'] },
                    },
                });
                const transport =
                    output[type].transport[
                        network === 'http' ? 'http1' : 'http2'
                    ];
                expect(transport.path).to.equal('/tunnel');
                expect(transport.headers.Host).to.equal('front.example');
            });
        }
    }

    for (const network of [undefined, 'tcp', 'ws']) {
        it(`preserves Egern Trojan ${
            network ?? 'default'
        } transport and chaining`, function () {
            const [output] = produceInternal('Egern', {
                ...trojan,
                network,
                'ws-opts': { path: '/ws', headers: { Host: 'front.example' } },
            });
            expect(output.trojan).to.include({
                prev_hop: 'chain',
                password: 'secret',
            });
            expect(output.trojan).not.to.have.property('next_hop');
            expect(output.trojan.transport).to.equal(undefined);
            if (network === 'ws') {
                expect(output.trojan.websocket).to.deep.equal({
                    path: '/ws',
                    host: 'front.example',
                });
            }
        });
    }

    it('accepts the correctly spelled Egern table cipher', function () {
        const [output] = produceInternal('Egern', {
            ...trojan,
            type: 'ss',
            cipher: 'table',
            tls: false,
        });
        expect(output.shadowsocks.method).to.equal('table');
    });

    for (const field of [
        'prev_hop',
        'underlying-proxy',
        'dialer-proxy',
        'detour',
    ]) {
        it(`preserves upstream Egern chaining through ${field}`, function () {
            const [output] = produceInternal('Egern', {
                ...trojan,
                prev_hop: undefined,
                [field]: 'chain',
            });
            expect(output.trojan.prev_hop).to.equal('chain');
            expect(output.trojan).not.to.have.property('next_hop');
        });
    }

    for (const type of ['vmess', 'vless']) {
        const base = {
            type,
            name: `QX ${type}`,
            server: 'example.com',
            port: 443,
            uuid: UUID,
            cipher: 'auto',
            tls: true,
        };

        it(`rejects QX ${type} HTTP/2 instead of changing its protocol`, function () {
            const { output, errors } = captureProduction(
                [
                    {
                        ...base,
                        network: 'h2',
                        'h2-opts': {
                            path: '/',
                            headers: { host: ['example.com'] },
                        },
                    },
                ],
                'QX',
                'external',
            );
            expect(output).to.equal('');
            expect(errors.join('\n')).to.include('network h2 is unsupported');
        });

        for (const [network, obfs] of [
            ['http', 'http'],
            ['ws', 'wss'],
            ['tcp', 'over-tls'],
        ]) {
            it(`preserves QX ${type} ${network} transport`, function () {
                const { output, errors } = captureProduction(
                    [
                        {
                            ...base,
                            network,
                            [`${network}-opts`]: {
                                path: '/tunnel',
                                headers: { Host: 'front.example' },
                            },
                        },
                    ],
                    'QX',
                    'external',
                );
                expect(errors).to.deep.equal([]);
                expect(output).to.include(`obfs=${obfs}`);
                if (network !== 'tcp') {
                    expect(output).to.include('obfs-uri=/tunnel');
                    expect(output).to.include('obfs-host=front.example');
                }
            });
        }
    }

    const hysteria2 = {
        type: 'hysteria2',
        name: 'Hysteria2 bandwidth',
        server: 'example.com',
        port: 443,
        password: 'secret',
    };

    for (const network of ['http', 'h2']) {
        it(`preserves sing-box Trojan ${network} transport fields`, function () {
            const [output] = produceInternal('sing-box', {
                ...trojan,
                network,
                [`${network}-opts`]: {
                    path: '/tunnel',
                    headers: { Host: 'front.example', host: ['front.example'] },
                },
            });
            expect(output.transport).to.include({
                type: 'http',
                path: '/tunnel',
            });
            expect(output.transport.host).to.equal('front.example');
        });
    }

    for (const [input, expected] of [
        [0, 0],
        [100, 100],
        ['100', 100],
        ['100 Mbps', 100],
        ['1 Gbps', 1000],
        ['1.001 Gbps', 1001],
        ['2 MBps', 16],
        ['1000 Kbps', 1],
        ['125 KBps', 1],
        ['1000000 bps', 1],
        ['1 Tbps', 1000000],
        [' 10 mbps ', 10],
        ['.125 MBps', 1],
        ['0.000125 GBps', 1],
        ['100000000000000000000 bps', 100000000000000],
        ['9007199254740991 Mbps', Number.MAX_SAFE_INTEGER],
    ]) {
        it(`converts Hysteria2 ${input} to integer Mbps`, function () {
            const [output] = produceInternal('sing-box', {
                ...hysteria2,
                up: input,
                down: input,
            });
            expect(output).to.include({
                up_mbps: expected,
                down_mbps: expected,
            });
            expect(output).to.not.have.property('up');
            expect(output).to.not.have.property('down');
        });
    }

    for (const input of [
        '500 Kbps',
        '1.5 Mbps',
        '-1',
        '1e3',
        '10 bananas',
        'Infinity',
        'NaN',
        false,
        [],
        '9007199254740992',
        '0.000000001 Mbps',
        '1000000000000.001 Mbps',
        '9007199254740990.1 Mbps',
        '1.0000000000000001 Mbps',
    ]) {
        it(`rejects unrepresentable Hysteria2 bandwidth ${JSON.stringify(
            input,
        )}`, function () {
            const { output, errors } = captureProduction(
                [{ ...hysteria2, up: input }],
                'sing-box',
            );
            expect(output).to.deep.equal([]);
            expect(errors.join('\n')).to.include('Hysteria2 up bandwidth');
        });
    }

    for (const input of [undefined, null, '', '   ']) {
        it(`omits unspecified Hysteria2 bandwidth ${JSON.stringify(
            input,
        )}`, function () {
            const [output] = produceInternal('sing-box', {
                ...hysteria2,
                up: input,
                down: input,
            });
            expect(output).to.not.have.property('up_mbps');
            expect(output).to.not.have.property('down_mbps');
        });
    }

    it('does not change Hysteria 1 string bandwidth support', function () {
        const [output] = produceInternal('sing-box', {
            ...hysteria2,
            type: 'hysteria',
            up: '1 Gbps',
            down: '500 Kbps',
        });
        expect(output).to.include({ up: '1 Gbps', down: '500 Kbps' });
    });
});
