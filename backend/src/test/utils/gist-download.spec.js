import { rejects } from 'assert';
import { expect } from 'chai';
import { describe, it } from 'mocha';

import Gist from '@/utils/gist';

describe('Gist and GitLab backup downloads', function () {
    for (const platform of ['github', 'gitlab']) {
        const endpoint = `/${platform === 'gitlab' ? 'snippets' : 'gists'}/123`;
        const rawUrl = `https://${platform}.example/raw/backup.json`;

        const createManager = (files) => {
            const requests = [];
            const manager = Object.create(Gist.prototype);
            manager.key = 'test-backup';
            manager.syncPlatform = platform;
            manager.locate = async () => ({ id: '123' });
            manager.http = {
                get: async (url) => {
                    requests.push(url);
                    if (url === endpoint)
                        return { body: JSON.stringify({ files }) };
                    if (url === rawUrl) return { body: 'backup content' };
                    throw new Error(`Unexpected request: ${url}`);
                },
            };
            return { manager, requests };
        };

        it(`downloads ${platform} file metadata and the matching raw URL`, async function () {
            const file = { path: 'backup.json', raw_url: rawUrl };
            const files =
                platform === 'gitlab'
                    ? [null, { path: 'other' }, file]
                    : { 'backup.json': file };
            const { manager, requests } = createManager(files);
            expect(await manager.download('backup.json')).to.equal(
                'backup content',
            );
            expect(requests).to.deep.equal([endpoint, rawUrl]);
        });

        for (const files of [undefined, null, {}, [], { 'backup.json': {} }]) {
            it(`rejects missing ${platform} files in ${JSON.stringify(
                files,
            )} without requesting raw content`, async function () {
                const { manager, requests } = createManager(files);
                await rejects(
                    () => manager.download('backup.json'),
                    /找不到文件 backup.json/,
                );
                expect(requests).to.deep.equal([endpoint]);
            });
        }

        it(`rejects a missing ${platform} backup with an Error object`, async function () {
            const { manager, requests } = createManager({});
            manager.locate = async () => null;
            await rejects(
                () => manager.download('backup.json'),
                /找不到 Sub-Store Gist/,
            );
            expect(requests).to.deep.equal([]);
        });

        it(`propagates ${platform} HTTP failures`, async function () {
            const { manager } = createManager({});
            const failure = new Error('HTTP 403');
            manager.http.get = async () => {
                throw failure;
            };
            await rejects(
                () => manager.download('backup.json'),
                (error) => error === failure,
            );
        });
    }
});
