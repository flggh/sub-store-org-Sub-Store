import { expect } from 'chai';
import { describe, it } from 'mocha';

import { hasCronArtifactSyncCredentials } from '@/products/cron-sync-artifacts-eligibility';

describe('cron artifact sync credentials', function () {
    it('allows token-only Gist-compatible sync settings', function () {
        expect(
            hasCronArtifactSyncCredentials({
                gistToken: 'token',
                githubUser: '',
            }),
        ).to.equal(true);
    });

    it('skips sync when the token is missing', function () {
        expect(
            hasCronArtifactSyncCredentials({
                githubUser: 'xream',
            }),
        ).to.equal(false);
    });
});
