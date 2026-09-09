import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { runBundle } from './run-bundle';

const backendPath = path.resolve(__dirname, '../../..');

describe('browser bundle compatibility', function () {
    this.timeout(60000);

    it('keeps the Buffer polyfill inside browser artifacts', async function () {
        const result = await runBundle(backendPath);

        expect(result.status, result.stderr || result.stdout).to.equal(0);

        for (const artifact of [
            'sub-store.min.js',
            'dist/proxy-utils.esm.mjs',
        ]) {
            const content = fs.readFileSync(
                path.join(backendPath, artifact),
                'utf8',
            );
            expect(content).to.not.match(
                /\b[A-Za-z_$][\w$]*\(\s*['\"]buffer['\"]\)/,
            );
            expect(content).to.not.match(/\bfrom\s+['\"]buffer['\"]/);
        }
    });
});
