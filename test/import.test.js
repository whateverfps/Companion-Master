import test from 'node:test';
import assert from 'node:assert/strict';

function createLocalStorage() {
  const values = new Map();

  return {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, String(value))
  };
}

function createIndexedDB() {
  const stores = new Map();
  let failNextSectionWrite = false;

  const ensureStore = name => {
    if (!stores.has(name)) {
      stores.set(name, {
        indexes: new Map(),
        records: new Map()
      });
    }
    return stores.get(name);
  };

  const database = {
    objectStoreNames: {
      contains: name => stores.has(name)
    },
    createObjectStore(name) {
      ensureStore(name);
      return upgradeStore(name);
    },
    transaction(storeNames, mode) {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const operations = [];
      const transaction = {
        error: null,
        objectStore: name => transactionStore(name, operations)
      };

      setTimeout(() => {
        if (
          mode === 'readwrite' &&
          failNextSectionWrite &&
          operations.some(operation =>
            operation.store === 'sections' &&
            operation.type === 'put'
          )
        ) {
          failNextSectionWrite = false;
          transaction.error = new Error('Simulated section transaction failure');
          transaction.onabort?.();
          return;
        }

        for (const operation of operations) {
          const records = ensureStore(operation.store).records;

          if (operation.type === 'put') {
            records.set(operation.value.id, structuredClone(operation.value));
          } else {
            records.delete(operation.key);
          }
        }

        transaction.oncomplete?.();
      }, 5);

      return transaction;
    },
    close() {}
  };

  function requestResult(value) {
    const request = {};
    setTimeout(() => {
      request.result = structuredClone(value);
      request.onsuccess?.();
    }, 0);
    return request;
  }

  function matchingRecords(storeName, indexName, key) {
    const store = ensureStore(storeName);
    const property = store.indexes.get(indexName);

    return [...store.records.values()].filter(record =>
      record[property] === key
    );
  }

  function indexApi(storeName, indexName, operations = null) {
    return {
      getAll: key => requestResult(
        matchingRecords(storeName, indexName, key)
      ),
      getAllKeys: key => {
        const request = {};
        setTimeout(() => {
          request.result = matchingRecords(storeName, indexName, key)
            .map(record => record.id);
          request.onsuccess?.();
        }, 0);
        return request;
      }
    };
  }

  function upgradeStore(name) {
    const store = ensureStore(name);

    return {
      indexNames: {
        contains: indexName => store.indexes.has(indexName)
      },
      createIndex(indexName, property) {
        store.indexes.set(indexName, property);
      }
    };
  }

  function transactionStore(name, operations) {
    const store = ensureStore(name);

    return {
      delete(key) {
        operations.push({ key, store: name, type: 'delete' });
      },
      getAll() {
        return requestResult([...store.records.values()]);
      },
      index(indexName) {
        const api = indexApi(name, indexName, operations);

        return {
          ...api,
          getAllKeys(key) {
            const request = {};
            setTimeout(() => {
              request.result = matchingRecords(name, indexName, key)
                .map(record => record.id);
              request.onsuccess?.();

              for (const record of matchingRecords(name, indexName, key)) {
                operations.push({
                  key: record.id,
                  store: name,
                  type: 'delete'
                });
              }
            }, 0);
            return request;
          }
        };
      },
      put(value) {
        operations.push({
          store: name,
          type: 'put',
          value: structuredClone(value)
        });
      }
    };
  }

  return {
    api: {
      deleteDatabase() {
        const request = {};
        setTimeout(() => {
          stores.clear();
          request.onsuccess?.();
        }, 0);
        return request;
      },
      open() {
        const request = {
          result: database,
          transaction: {
            objectStore: name => upgradeStore(name)
          }
        };

        setTimeout(() => {
          if (!stores.size) {
            request.onupgradeneeded?.();
          }
          request.onsuccess?.();
        }, 0);

        return request;
      }
    },
    failNextSectionWrite() {
      failNextSectionWrite = true;
    }
  };
}

function textFile(name = 'requirements.txt') {
  const content = '# Requirements\nChief shall preserve evidence.\n';

  return {
    name,
    type: 'text/plain',
    size: content.length,
    lastModified: 123,
    text: async () => content
  };
}

const database = createIndexedDB();
globalThis.indexedDB = database.api;
globalThis.localStorage = createLocalStorage();
globalThis.window = {
  dispatchEvent() {}
};
globalThis.CustomEvent = class {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};

const { engine } = await import('../src/engine.js');

test('successful imports atomically register one document and its sections', async () => {
  const stages = [];
  const result = await engine.ingest(
    [textFile()],
    progress => stages.push(progress.stage),
    'general-library'
  );
  const documents = await engine.documents();
  const sections = await engine.sections();

  assert.equal(result.documents[0].status, 'verified');
  assert.equal(result.documents[0].lineageId, result.documents[0].id);
  assert.equal(result.documents[0].lineageStatus, 'current');
  assert.ok(result.documents[0].importedAt);
  assert.equal(documents.length, 1);
  assert.equal(sections.length, result.documents[0].sectionCount);
  assert.ok(sections.every(section =>
    section.documentId === documents[0].id
  ));
  assert.deepEqual(
    [...new Set(stages)],
    ['extracting', 'detecting', 'indexing', 'verifying']
  );
});

test('failed extraction leaves no document or section and retry does not duplicate', async () => {
  let attempt = 0;
  const file = textFile('retry.txt');
  file.text = async () => {
    attempt += 1;
    if (attempt === 1) throw new Error('Temporary read failure');
    return '# Retry\nRecovered content.';
  };

  const failed = await engine.ingest(
    [file],
    () => {},
    'general-library',
    { duplicateAction: 'reimport' }
  );

  assert.equal(failed.documents[0].status, 'error');
  assert.equal((await engine.documents()).length, 1);

  const retried = await engine.ingest(
    [file],
    () => {},
    'general-library',
    { duplicateAction: 'reimport' }
  );
  const documents = await engine.documents();
  const retryDocuments = documents.filter(document =>
    document.name === file.name
  );
  const retrySections = (await engine.sections()).filter(section =>
    section.documentId === retryDocuments[0].id
  );

  assert.equal(retried.documents[0].status, 'verified');
  assert.equal(retryDocuments.length, 1);
  assert.equal(retrySections.length, retryDocuments[0].sectionCount);
});

test('a failed document-and-section transaction rolls back the document write', async () => {
  const beforeDocuments = await engine.documents();
  const beforeSections = await engine.sections();
  database.failNextSectionWrite();

  await assert.rejects(
    engine.ingest(
      [textFile('atomic.txt')],
      () => {},
      'general-library',
      { duplicateAction: 'reimport' }
    ),
    /Simulated section transaction failure/
  );

  assert.equal((await engine.documents()).length, beforeDocuments.length);
  assert.equal((await engine.sections()).length, beforeSections.length);
});

test('duplicate detection leaves library and section counts unchanged', async () => {
  const file = textFile('duplicate.txt');
  await engine.ingest([file], () => {}, 'general-library');
  const documentsBefore = await engine.documents();
  const sectionsBefore = await engine.sections();
  const duplicate = await engine.ingest(
    [file],
    () => {},
    'general-library'
  );

  assert.equal(duplicate.documents.length, 0);
  assert.equal(duplicate.skipped.length, 1);
  assert.equal((await engine.documents()).length, documentsBefore.length);
  assert.equal((await engine.sections()).length, sectionsBefore.length);
});

test('re-import records an explicit duplicate without replacing the current document', async () => {
  const file = textFile('lineage-duplicate.txt');
  const original = await engine.ingest([file], () => {}, 'general-library');
  const duplicate = await engine.ingest(
    [file],
    () => {},
    'general-library',
    { duplicateAction: 'reimport' }
  );
  const originalDocument = original.documents[0];
  const duplicateDocument = duplicate.documents[0];

  assert.equal(duplicateDocument.lineageId, originalDocument.lineageId);
  assert.equal(duplicateDocument.lineageStatus, 'duplicate');
  assert.equal(duplicateDocument.duplicateOfDocumentId, originalDocument.id);
  assert.equal(
    (await engine.documents()).find(item => item.id === originalDocument.id).lineageStatus,
    'current'
  );
});

test('replace atomically preserves the superseded document and its sections', async () => {
  const file = textFile('lineage-replace.txt');
  const original = await engine.ingest([file], () => {}, 'general-library');
  const originalDocument = original.documents[0];
  const replaced = await engine.ingest(
    [file],
    () => {},
    'general-library',
    {
      duplicateAction: 'replace',
      duplicateDocumentId: originalDocument.id
    }
  );
  const currentDocument = replaced.documents[0];
  const documents = await engine.documents();
  const storedOriginal = documents.find(item => item.id === originalDocument.id);
  const storedCurrent = documents.find(item => item.id === currentDocument.id);
  const sections = await engine.sections();

  assert.equal(storedOriginal.lineageId, originalDocument.lineageId);
  assert.equal(storedOriginal.lineageStatus, 'superseded');
  assert.equal(storedOriginal.supersededByDocumentId, currentDocument.id);
  assert.equal(storedCurrent.lineageId, originalDocument.lineageId);
  assert.equal(storedCurrent.lineageStatus, 'current');
  assert.equal(storedCurrent.previousDocumentId, originalDocument.id);
  assert.equal(
    sections.filter(section => section.documentId === originalDocument.id).length,
    originalDocument.sectionCount
  );
  assert.equal(
    sections.filter(section => section.documentId === currentDocument.id).length,
    currentDocument.sectionCount
  );
  assert.ok((await engine.retrievableSections()).every(section =>
    section.documentId !== originalDocument.id
  ));
});

test('failed replacement leaves the existing lineage current and unchanged', async () => {
  const file = textFile('lineage-rollback.txt');
  const original = await engine.ingest([file], () => {}, 'general-library');
  const originalDocument = original.documents[0];
  database.failNextSectionWrite();

  await assert.rejects(
    engine.ingest(
      [file],
      () => {},
      'general-library',
      {
        duplicateAction: 'replace',
        duplicateDocumentId: originalDocument.id
      }
    ),
    /Simulated section transaction failure/
  );

  const family = (await engine.documents()).filter(document =>
    document.lineageId === originalDocument.lineageId
  );
  assert.equal(family.length, 1);
  assert.equal(family[0].id, originalDocument.id);
  assert.equal(family[0].lineageStatus, 'current');
  assert.equal(family[0].supersededByDocumentId, undefined);
});
