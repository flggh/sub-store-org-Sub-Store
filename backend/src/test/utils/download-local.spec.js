import { rejects } from 'assert';
import { expect } from 'chai';
import { after, afterEach, before, beforeEach, describe, it } from 'mocha';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

import $ from '@/core/app';
import download from '@/utils/download';

const openApi = require('@/vendor/open-api');

describe('Local file downloads', function () {
    let tempDir;
    let originals;
    let originalENV;
    let originalHTTP;

    before(function () {
        tempDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'sub-store-local-download-'),
        );
    });

    beforeEach(function () {
        originals = {
            read: $.read,
            write: $.write,
            info: $.info,
            error: $.error,
        };
        originalENV = openApi.ENV;
        originalHTTP = openApi.HTTP;
        $.read = () => undefined;
        $.write = () => {};
        $.info = () => {};
        $.error = () => {};
        openApi.ENV = () => ({ isNode: true });
        openApi.HTTP = () => {
            throw new Error('Local files must not use HTTP');
        };
    });

    afterEach(function () {
        Object.assign($, originals);
        openApi.ENV = originalENV;
        openApi.HTTP = originalHTTP;
    });

    after(function () {
        if (
            path.dirname(tempDir) !== path.resolve(os.tmpdir()) ||
            !path.basename(tempDir).startsWith('sub-store-local-download-')
        ) {
            throw new Error('Unexpected temporary directory');
        }
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('reads an absolute path without issuing HTTP requests', async function () {
        const filename = path.join(tempDir, 'local config 中文.yaml');
        fs.writeFileSync(filename, 'proxies: []', 'utf8');
        expect(await download(filename)).to.equal('proxies: []');
    });

    it('reads encoded file URLs with spaces, percent signs and hashes', async function () {
        const filename = path.join(tempDir, 'local 中文 %#.yaml');
        fs.writeFileSync(filename, 'rules: []', 'utf8');
        expect(await download(pathToFileURL(filename).href)).to.equal(
            'rules: []',
        );
    });

    it('separates file URL options from the encoded filename', async function () {
        const filename = path.join(tempDir, 'with#fragment.yaml');
        fs.writeFileSync(filename, 'rules: []', 'utf8');
        expect(
            await download(`${pathToFileURL(filename).href}#noCache`),
        ).to.equal('rules: []');
    });

    it('reports missing files as file errors rather than HTTP errors', async function () {
        await rejects(
            () => download(path.join(tempDir, 'missing.yaml')),
            /无法从该路径读取文本内容/,
        );
    });
});
