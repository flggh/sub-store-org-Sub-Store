import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';

import express from '@/vendor/express';

const openApi = require('@/vendor/open-api');

describe('Mobile Express adapter regressions', function () {
    let originalENV;
    let originalRequest;
    let originalDone;
    let app;
    let responses;

    beforeEach(function () {
        originalENV = openApi.ENV;
        originalRequest = Object.getOwnPropertyDescriptor(
            globalThis,
            '$request',
        );
        originalDone = Object.getOwnPropertyDescriptor(globalThis, '$done');
        openApi.ENV = () => ({ isNode: false, isQX: true });
        responses = [];
        globalThis.$done = (response) => responses.push(response);
        app = express({ substore: { info() {} } });
    });

    afterEach(function () {
        openApi.ENV = originalENV;
        for (const [key, descriptor] of [
            ['$request', originalRequest],
            ['$done', originalDone],
        ]) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globalThis[key];
        }
    });

    function request({
        method = 'GET',
        url = 'https://sub.store/probe',
        headers = {},
        body,
    } = {}) {
        globalThis.$request = { method, url, headers, body };
        app.start();
        expect(responses).not.to.be.empty;
        return responses[responses.length - 1];
    }

    it('registers and dispatches HEAD handlers', function () {
        let called = false;
        app.head('/probe', (req, res) => {
            called = true;
            expect(req.method).to.equal('HEAD');
            res.end();
        });
        expect(request({ method: 'HEAD' }).status).to.equal('HTTP/1.1 200 OK');
        expect(called).to.equal(true);
    });

    it('preserves headers and a parsed JSON body through next()', function () {
        let firstBody;
        app.post('/probe', (req, res, next) => {
            firstBody = req.body;
            return next();
        });
        app.post('/probe', (req, res) => {
            expect(req.body).to.equal(firstBody);
            expect(req.headers['x-test']).to.equal('present');
            res.json(req.body);
        });
        const response = request({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Test': 'present',
            },
            body: '{"enabled":false}',
        });
        expect(JSON.parse(response.body)).to.deep.equal({ enabled: false });
    });

    it('does not parse a JSON string primitive a second time in next()', function () {
        app.post('/probe', (req, res, next) => next());
        app.post('/probe', (req, res) => res.json(req.body));
        const response = request({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '"value"',
        });
        expect(JSON.parse(response.body)).to.equal('value');
    });

    it('preserves equals signs, bare switches and malformed query escapes', function () {
        app.get('/probe', (req, res) =>
            res.json({ query: req.query, params: req.params }),
        );
        const response = request({
            url: 'https://sub.store/probe?key=abc==&flag&empty=&broken=%E0%A4%A',
        });
        expect(JSON.parse(response.body).query).to.deep.equal({
            key: 'abc==',
            flag: true,
            empty: true,
            broken: '%E0%A4%A',
        });
    });

    it('preserves malformed path escapes without aborting dispatch', function () {
        app.get('/probe/:name', (req, res) => res.json(req.params));
        const response = request({ url: 'https://sub.store/probe/%E0%A4%A' });
        expect(JSON.parse(response.body)).to.deep.equal({ name: '%E0%A4%A' });
    });

    it('returns a QX 400 response for malformed JSON before calling handlers', function () {
        let calls = 0;
        app.post('/probe', (req, res) => {
            calls += 1;
            res.end();
        });
        const response = request({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{"secret":"do-not-log"',
        });
        expect(response.status).to.equal('HTTP/1.1 400 Bad Request');
        expect(response.body).not.to.include('do-not-log');
        expect(calls).to.equal(0);
    });

    it('handles an empty JSON body and does not parse plain text', function () {
        app.post('/probe', (req, res) => res.json(req.body));
        expect(
            JSON.parse(
                request({
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: '',
                }).body,
            ),
        ).to.deep.equal({});
        expect(
            JSON.parse(
                request({
                    method: 'POST',
                    headers: { 'content-type': 'text/plain' },
                    body: 'raw=text==',
                }).body,
            ),
        ).to.equal('raw=text==');
    });

    it('processes CORS preflight before parsing a JSON body', function () {
        const response = request({
            method: 'OPTIONS',
            headers: {
                origin: 'https://sub-store.vercel.app',
                'content-type': 'application/json',
            },
            body: '{invalid',
        });
        expect(response.status).to.equal('HTTP/1.1 200 OK');
    });

    it('does not share mutable response headers between requests', function () {
        app.get('/first', (req, res) => res.set('X-First', 'only-first').end());
        app.get('/second', (req, res) => res.end());
        const first = request({ url: 'https://sub.store/first' });
        const second = request({ url: 'https://sub.store/second' });
        expect(first.headers['X-First']).to.equal('only-first');
        expect(second.headers).not.to.have.property('X-First');
        expect(first.headers).not.to.equal(second.headers);
    });
});
