import { expect } from 'chai';
import { describe, it } from 'mocha';

import {
    getGithubAvatarApiUrl,
    shouldRefreshArtifactStoreForSettingsPatch,
} from '@/restful/settings';

describe('settings routes', function () {
    describe('artifact store refresh detection', function () {
        it('refreshes when GitHub API URL changes', function () {
            expect(
                shouldRefreshArtifactStoreForSettingsPatch({
                    githubApiUrl: 'https://litegist.example.com/api',
                }),
            ).to.equal(true);
        });

        it('refreshes when a Gist-affecting setting is cleared', function () {
            expect(
                shouldRefreshArtifactStoreForSettingsPatch({
                    githubProxy: '',
                }),
            ).to.equal(true);
        });

        it('does not refresh for unrelated settings', function () {
            expect(
                shouldRefreshArtifactStoreForSettingsPatch({
                    logsMaxCount: 100,
                }),
            ).to.equal(false);
        });

        it('does not refresh when only GitHub username changes', function () {
            expect(
                shouldRefreshArtifactStoreForSettingsPatch({
                    githubUser: 'xream',
                }),
            ).to.equal(false);
        });
    });

    describe('GitHub avatar API URL', function () {
        it('uses the default GitHub users API when no custom API URL is set', function () {
            expect(
                getGithubAvatarApiUrl({
                    username: 'xream',
                }),
            ).to.equal('https://api.github.com/users/xream');
        });

        it('applies GitHub proxy only to the default GitHub users API', function () {
            expect(
                getGithubAvatarApiUrl({
                    username: 'xream',
                    githubProxy: 'https://proxy.example.com/',
                }),
            ).to.equal(
                'https://proxy.example.com/https://api.github.com/users/xream',
            );
        });

        it('does not apply GitHub proxy to a custom GitHub users API', function () {
            expect(
                getGithubAvatarApiUrl({
                    username: 'xream',
                    githubApiUrl: 'https://litegist.example.com/api/',
                    githubProxy: 'https://proxy.example.com/',
                }),
            ).to.equal('https://litegist.example.com/api/users/xream');
        });
    });
});
