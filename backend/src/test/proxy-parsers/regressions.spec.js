import { expect } from 'chai';
import { Base64 } from 'js-base64';

import { UUID, parseOne } from './helpers';

describe('URI parsing regressions', function () {
    const password = 'literal%2F%25==中文';

    it('does not URL-decode a Base64 Shadowsocks password a second time', function () {
        const proxy = parseOne(
            `ss://${Base64.encode(
                `aes-128-gcm:${password}`,
            )}@example.com:443#SS`,
        );
        expect(proxy.password).to.equal(password);
        expect(proxy.port).to.equal(443);
    });

    for (const scheme of ['anytls', 'tuic']) {
        it(`decodes a ${scheme} password exactly once and preserves false flags`, function () {
            const userInfo = scheme === 'tuic' ? `${UUID}:` : '';
            const query = scheme === 'tuic' ? 'fast-open=false' : 'udp=0';
            const proxy = parseOne(
                `${scheme}://${userInfo}${encodeURIComponent(
                    password,
                )}@example.com:443?${query}#test`,
            );
            expect(proxy.password).to.equal(password);
            expect(proxy[scheme === 'tuic' ? 'tfo' : 'udp']).to.equal(false);
        });
    }

    it('parses SSR links that do not contain an optional query', function () {
        const encoded = Base64.encode(
            `example.com:443:origin:aes-128-gcm:plain:${Base64.encode(
                'secret',
            )}`,
        );
        const proxy = parseOne(`ssr://${encoded}`);
        expect(proxy).to.include({
            type: 'ssr',
            port: 443,
            password: 'secret',
        });
    });

    it('normalizes VMess JSON ports to numbers', function () {
        const encoded = Base64.encode(
            JSON.stringify({
                v: '2',
                ps: 'VMess',
                add: 'example.com',
                port: '443',
                id: UUID,
                aid: '0',
                net: 'ws',
                type: 'none',
                host: 'front.example',
                path: '/tunnel',
                tls: 'tls',
            }),
        );
        const proxy = parseOne(`vmess://${encoded}`);
        expect(proxy.port).to.equal(443);
        expect(proxy['ws-opts'].headers.Host).to.equal('front.example');
    });

    it('does not mistake a Trojan fragment for a port', function () {
        expect(parseOne('trojan://secret@example.com#name:8443')).to.include({
            port: 443,
            name: 'name:8443',
        });
        expect(
            parseOne('trojan://secret@example.com:8443#name:443'),
        ).to.include({ port: 8443, name: 'name:443' });
    });

    it('preserves Hysteria2 ALPN lists', function () {
        const proxy = parseOne(
            'hysteria2://secret@example.com:443?alpn=h3,h2#HY2',
        );
        expect(proxy.alpn).to.deep.equal(['h3', 'h2']);
    });
});

describe('WireGuard URI regressions', function () {
    for (const field of ['reserved', 'address', 'ip', 'mtu']) {
        for (const suffix of ['', '=']) {
            it(`ignores an empty optional ${field}${suffix} without dropping the node`, function () {
                const proxy = parseOne(
                    `wireguard://private%3D@wg.example:51820?${field}${suffix}&publickey=public==#WG`,
                );
                expect(proxy).to.include({
                    name: 'WG',
                    'private-key': 'private=',
                    'public-key': 'public==',
                });
                expect(proxy).to.not.have.property(field);
            });
        }
    }

    it('preserves valid addresses, reserved bytes and padded keys', function () {
        const proxy = parseOne(
            'wireguard://private%3D@wg.example:51820?publickey=public==&reserved=1,2,3&address=10.0.0.2/32,fd00::2/128&mtu=1280#WG',
        );
        expect(proxy).to.include({
            'private-key': 'private=',
            'public-key': 'public==',
            ip: '10.0.0.2',
            ipv6: 'fd00::2',
            mtu: 1280,
        });
        expect(proxy.reserved).to.deep.equal([1, 2, 3]);
    });

    it('does not turn an absent private key into a string', function () {
        const proxy = parseOne(
            'wireguard://wg.example:51820?publickey=public==#WG',
        );
        expect(proxy['private-key']).to.equal(undefined);
    });
});
