import { expect } from 'chai';
import { describe, it } from 'mocha';

import { parseFlowHeaders } from '@/utils/flow';

describe('Flow header parsing regressions', function () {
    it('treats missing download and total fields as zero', function () {
        const flow = parseFlowHeaders('upload=1024');
        expect(flow.usage).to.deep.equal({ upload: 1024, download: 0 });
        expect(flow.total).to.equal(0);
    });

    it('preserves malformed optional URL escapes instead of losing flow data', function () {
        const flow = parseFlowHeaders(
            'upload=1;download=2;total=3;app_url=%E0%A4%A;plan_name=%GG',
        );
        expect(flow).to.include({
            total: 3,
            appUrl: '%E0%A4%A',
            planName: '%GG',
        });
        expect(flow.usage).to.deep.equal({ upload: 1, download: 2 });
    });
});
