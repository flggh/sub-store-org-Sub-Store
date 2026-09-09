import { expect } from 'chai';
import { describe, it } from 'mocha';

import {
    deleteByName,
    findByName,
    findIndexByName,
    updateByName,
} from '@/utils/database';

describe('Database list helpers', function () {
    it('does not delete or update the last item when a name is missing', function () {
        const list = [{ name: 'first' }, { name: 'last' }];
        deleteByName(list, 'missing');
        updateByName(list, 'missing', { name: 'unexpected' });
        expect(list).to.deep.equal([{ name: 'first' }, { name: 'last' }]);
        expect(list).not.to.have.own.property('-1');
    });

    for (const list of [null, undefined, false, {}, 'text']) {
        it(`handles non-array storage ${JSON.stringify(list)}`, function () {
            expect(findByName(list, 'name')).to.equal(undefined);
            expect(findIndexByName(list, 'name')).to.equal(-1);
            expect(() => deleteByName(list, 'name')).not.to.throw();
            expect(() => updateByName(list, 'name', {})).not.to.throw();
        });
    }

    it('still finds, updates and deletes matching entries by a custom field', function () {
        const list = [{ id: 'first' }, { id: 'last' }];
        expect(findByName(list, 'first', 'id')).to.equal(list[0]);
        updateByName(list, 'first', { id: 'updated' }, 'id');
        deleteByName(list, 'last', 'id');
        expect(list).to.deep.equal([{ id: 'updated' }]);
    });
});
