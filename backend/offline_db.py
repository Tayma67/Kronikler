"""Offline mod — bellek-içi async 'Mongo' (GDD v8 SAHNE: Google Play).

Uygulamanın kullandığı veritabanı yüzeyi sadece 8 çağrı / 2 koleksiyon:
find_one, update_one(upsert), insert_one, delete_one, delete_many,
create_index. Bu shim o yüzeyi birebir karşılar; Pyodide içinde motor/
pymongo'ya hiç gerek kalmaz. Kayıtlar JSON olarak dışa/içe aktarılır
(cihazda IndexedDB'ye yazılır).
"""
import json
import uuid


def _match(doc, query):
    for k, v in (query or {}).items():
        if k == "_id":
            if str(doc.get("_id")) != str(v):
                return False
        elif isinstance(v, dict) and "$ne" in v:
            if doc.get(k) == v["$ne"]:
                return False
        elif doc.get(k) != v:
            return False
    return True


class _Result:
    def __init__(self, inserted_id=None, deleted_count=0):
        self.inserted_id = inserted_id
        self.deleted_count = deleted_count


class _Collection:
    def __init__(self):
        self.docs = []

    async def find_one(self, query=None):
        for d in self.docs:
            if _match(d, query):
                return json.loads(json.dumps(d, default=str))
        return None

    async def insert_one(self, doc):
        d = dict(doc)
        d.setdefault("_id", uuid.uuid4().hex)
        self.docs.append(d)
        return _Result(inserted_id=d["_id"])

    async def update_one(self, query, update, upsert=False):
        setter = update.get("$set", {})
        for i, d in enumerate(self.docs):
            if _match(d, query):
                nd = dict(d)
                nd.update(json.loads(json.dumps(setter, default=str)))
                self.docs[i] = nd
                return _Result()
        if upsert:
            nd = dict(query)
            nd.update(json.loads(json.dumps(setter, default=str)))
            nd.setdefault("_id", uuid.uuid4().hex)
            self.docs.append(nd)
        return _Result()

    async def delete_one(self, query):
        for i, d in enumerate(self.docs):
            if _match(d, query):
                self.docs.pop(i)
                return _Result(deleted_count=1)
        return _Result(deleted_count=0)

    async def delete_many(self, query):
        once = len(self.docs)
        self.docs = [d for d in self.docs if not _match(d, query)]
        return _Result(deleted_count=once - len(self.docs))

    async def create_index(self, *a, **k):
        return None


class OfflineDB:
    def __init__(self):
        self._cols = {}

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self._cols.setdefault(name, _Collection())

    def __getitem__(self, name):
        return self.__getattr__(name)

    # ── Kalıcılık: cihaz tarafı JS bunları IndexedDB'ye yazar/okur ──
    def export_json(self):
        return json.dumps({k: c.docs for k, c in self._cols.items()},
                          default=str, ensure_ascii=False)

    def import_json(self, raw):
        data = json.loads(raw) if raw else {}
        for k, docs in data.items():
            col = self.__getattr__(k)
            col.docs = docs


class OfflineClient:
    """motor.AsyncIOMotorClient yerine geçer."""
    _db = OfflineDB()

    def __init__(self, *a, **k):
        pass

    def __getitem__(self, name):
        return OfflineClient._db

    def close(self):
        pass
