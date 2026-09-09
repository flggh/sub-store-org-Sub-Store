import { expect } from 'chai';
import { describe, it } from 'mocha';

import { deduplicateRules, RuleUtils } from '@/core/rule-utils';

describe('Rule regressions', function () {
    it('deduplicates in order without merging different options or changing input', function () {
        const rules = [
            { type: 'IP-CIDR', content: '10.0.0.0/8' },
            { type: 'DOMAIN', content: 'example.com' },
            { type: 'IP-CIDR', content: '10.0.0.0/8', options: ['no-resolve'] },
            { type: 'IP-CIDR', content: '10.0.0.0/8', options: [] },
            { type: 'IP-CIDR', content: '10.0.0.0/8', options: ['no-resolve'] },
        ];
        const original = JSON.parse(JSON.stringify(rules));
        const result = deduplicateRules(rules);

        expect(result).to.deep.equal(rules.slice(0, 3));
        expect(result[0]).to.equal(rules[0]);
        expect(rules).to.deep.equal(original);
    });

    it('handles a large rule list and retains the first occurrences', function () {
        const rules = Array.from({ length: 20000 }, (unused, index) => ({
            type: 'DOMAIN',
            content: `host-${index}.example`,
        }));
        expect(deduplicateRules([...rules, ...rules])).to.deep.equal(rules);
    });

    it('skips only comment lines and preserves hashes inside rule content', function () {
        expect(
            RuleUtils.parse('  # comment\nDOMAIN,example.com#tag\n'),
        ).to.deep.equal([{ type: 'DOMAIN', content: 'example.com#tag' }]);
    });

    it('parses rules with and without a Clash provider header', function () {
        const expected = [{ type: 'DOMAIN', content: 'example.com' }];
        expect(RuleUtils.parse('DOMAIN,example.com')).to.deep.equal(expected);
        expect(
            RuleUtils.parse('payload:\n  - DOMAIN,example.com'),
        ).to.deep.equal(expected);
        expect(RuleUtils.parse('payload:\n')).to.deep.equal([]);
        expect(RuleUtils.parse('')).to.deep.equal([]);
    });

    it('filters unsupported QX DST-PORT rules and null outputs', function () {
        const rules = RuleUtils.parse(
            'DEST-PORT,443\nDST-PORT,80\nDOMAIN,example.com',
        );
        expect(rules.slice(0, 2).map((rule) => rule.type)).to.deep.equal([
            'DST-PORT',
            'DST-PORT',
        ]);
        expect(RuleUtils.produce(rules, 'QX')).to.equal(
            'HOST,example.com,SUB-STORE',
        );
        expect(RuleUtils.produce(rules.slice(0, 2), 'QX')).to.equal('');
    });
});
