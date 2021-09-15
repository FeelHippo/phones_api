import * as Loki from 'lokijs';

export const loadCollection = (colName: string, db: Loki): Promise<Loki.Collection<any>> => new Promise(
  resolve => {
    db.loadDatabase({}, () => {
      const _collection = db.getCollection(colName) || db.addCollection(colName);
      resolve(_collection);
    })
  }
)