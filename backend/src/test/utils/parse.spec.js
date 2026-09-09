import { expect } from 'chai';

import {
    parseArgumentString,
    parseBooleanStyleArgs,
    safeDecodeURIComponent,
    splitKeyValuePair,
} from '@/utils/parse';

describe('Argument parsing', function () {
    it('splits only the first equals sign', function () {
        expect(splitKeyValuePair('key=abc==')).to.deep.equal(['key', 'abc==']);
        expect(splitKeyValuePair('flag')).to.deep.equal(['flag', undefined]);
        expect(splitKeyValuePair('empty=')).to.deep.equal(['empty', '']);
    });

    it('decodes valid escapes once and preserves malformed escapes', function () {
        expect(safeDecodeURIComponent('%2525')).to.equal('%25');
        expect(safeDecodeURIComponent('100%')).to.equal('100%');
    });

    it('keeps boolean-style values and flags compatible', function () {
        expect(
            parseBooleanStyleArgs(
                'flag&empty=&key=abc==&false=false&bad=100%&&',
            ),
        ).to.deep.equal({
            flag: true,
            empty: true,
            key: 'abc==',
            false: 'false',
            bad: '100%',
        });
    });

    it('does not decode Loon raw arguments', function () {
        expect(
            parseArgumentString('key=abc==&value=%2525&empty=&flag&&'),
        ).to.deep.equal({
            key: 'abc==',
            value: '%2525',
            empty: true,
            flag: true,
        });
    });

    it('accepts object arguments without modifying the caller', function () {
        const input = Object.freeze({
            includeUnsupportedProxy: true,
            key: 'abc==',
        });
        const parsed = parseArgumentString(input);
        expect(parsed).to.deep.equal(input);
        expect(parsed).to.not.equal(input);
        parsed.key = 'changed';
        expect(input.key).to.equal('abc==');
    });

    for (const input of [undefined, null, false, 1, []]) {
        it(`handles non-string arguments ${JSON.stringify(
            input,
        )}`, function () {
            expect(parseArgumentString(input)).to.deep.equal({});
            expect(parseBooleanStyleArgs(input)).to.deep.equal({});
        });
    }
});
