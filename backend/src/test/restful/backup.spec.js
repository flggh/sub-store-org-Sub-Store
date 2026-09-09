import { rejects } from 'assert';
import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { Base64 } from 'js-base64';

import $ from '@/core/app';
import register, { gistBackupAction } from '@/restful/miscs';
import Gist from '@/utils/gist';

describe('Backup restore routes', function () {
    let originals;
    let originalDownload;
    let writes;
    let logs;
    let restore;

    beforeEach(function () {
        originals = {
            read: $.read,
            write: $.write,
            info: $.info,
            error: $.error,
            cache: $.cache,
            persistCache: $.persistCache,
        };
        originalDownload = Gist.prototype.download;
        writes = [];
        logs = [];
        $.cache = { settings: { gistToken: 'existing-token' }, subs: [] };
        $.read = (key) =>
            key === '#sub-store' ? JSON.stringify($.cache) : $.cache[key];
        $.write = (value, key) => {
            writes.push({ key, value });
            if (key !== '#sub-store') $.cache[key] = value;
            return true;
        };
        $.persistCache = () => writes.push({ key: 'persist' });
        $.info = () => {};
        $.error = (message) => logs.push(message);
        const app = {
            get() {
                return this;
            },
            all() {
                return this;
            },
            options() {
                return this;
            },
            route() {
                return {
                    get() {
                        return this;
                    },
                    post(handler) {
                        restore = handler;
                        return this;
                    },
                };
            },
        };
        register(app);
    });

    afterEach(function () {
        Object.assign($, originals);
        Gist.prototype.download = originalDownload;
    });

    function requestRestore(content) {
        const response = {
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(body) {
                this.body = body;
                return this;
            },
        };
        restore({ body: { content } }, response);
        return response;
    }

    for (const [encoding, encode] of [
        ['JSON', (value) => value],
        ['Base64', Base64.encode],
    ]) {
        it(`restores valid ${encoding} data`, function () {
            const response = requestRestore(
                encode(JSON.stringify({ settings: { marker: 'restored' } })),
            );
            expect(response.body.status).to.equal('success');
            expect($.cache.settings.marker).to.equal('restored');
            expect(writes.some((write) => write.key === '#sub-store')).to.equal(
                true,
            );
        });

        for (const invalid of [
            null,
            [],
            'text',
            { settings: [] },
            { settings: null },
            {},
        ]) {
            it(`rejects ${encoding} ${JSON.stringify(
                invalid,
            )} before writing data`, function () {
                const previous = $.cache;
                const response = requestRestore(
                    encode(JSON.stringify(invalid)),
                );
                expect(response.body.error).to.include({
                    code: 'INVALID_BACKUP_DATA',
                    message: 'Invalid backup data, failed to restore!',
                });
                expect(writes).to.deep.equal([]);
                expect($.cache).to.equal(previous);
            });
        }
    }

    it('rejects malformed JSON without putting backup secrets into logs', function () {
        requestRestore('{"gistToken":"sensitive-value"');
        expect(logs.join('\n')).not.to.include('sensitive-value');
        expect(writes).to.deep.equal([]);
    });

    it('rejects an invalid Gist backup before writing storage', async function () {
        Gist.prototype.download = async () => Base64.encode('{"settings":[]}');
        await rejects(() => gistBackupAction('download'), /settings/);
        expect(writes).to.deep.equal([]);
        expect($.cache.settings.gistToken).to.equal('existing-token');
    });
});
