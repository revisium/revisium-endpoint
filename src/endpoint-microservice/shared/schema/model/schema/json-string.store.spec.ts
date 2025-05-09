import {
  JsonStringStore,
  JsonStringValueStore,
} from 'src/endpoint-microservice/shared/schema';

describe('JsonStringStore', () => {
  it('foreignKey', () => {
    const store = new JsonStringStore();

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
    });

    store.foreignKey = 'tableId';

    expect(store.getPlainSchema()).toStrictEqual({
      type: 'string',
      default: '',
      foreignKey: 'tableId',
    });
  });

  it('registerValue', () => {
    const store = new JsonStringStore();

    expect(store.getValue('row-1')).toBeUndefined();
    expect(store.getValue('row-2')).toBeUndefined();

    const value1_1 = new JsonStringValueStore(store, 'row-1', 'value1_1');
    expect(value1_1.index).toEqual(0);
    const value1_2 = new JsonStringValueStore(store, 'row-1', 'value1_2');
    expect(value1_2.index).toEqual(1);
    const value2 = new JsonStringValueStore(store, 'row-2', 'value2');
    expect(value2.index).toEqual(0);

    expect(store.getValue('row-1')).toEqual(value1_1);
    expect(store.getValue('row-1', 1)).toEqual(value1_2);
    expect(store.getValue('row-2', 0)).toEqual(value2);
  });

  it('should return $ref', () => {
    const store = new JsonStringStore();
    store.$ref = 'ref.json';

    expect(store.getPlainSchema()).toStrictEqual({
      $ref: 'ref.json',
    });
  });
});
