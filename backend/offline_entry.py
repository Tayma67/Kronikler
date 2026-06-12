"""Offline mod giriş noktası — oyun motoru CİHAZIN İÇİNDE çalışır.

Pyodide (WebAssembly Python) bu dosyayı yükler; motor/bson/dotenv gibi
sunucu bağımlılıkları sahte modüllerle karşılanır ve MEVCUT FastAPI
uygulaması değiştirilmeden ayağa kalkar. JS tarafı `call()` ile HTTP
yerine doğrudan ASGI çağrısı yapar; kayıtlar `export_saves`/`import_saves`
ile cihaza (IndexedDB) yazılır.

Kullanım (JS/Pyodide):
    import offline_entry
    await offline_entry.boot()
    res = await offline_entry.call("POST", "/api/game/new", '{"first_name":"X"}', "cihaz-1")
"""
import json
import os
import sys
import types


def _install_fakes():
    os.environ.setdefault("MONGO_URL", "offline://yerel")
    os.environ.setdefault("DB_NAME", "kronikler")
    os.environ.setdefault("JWT_SECRET", "offline-" + "k" * 40)

    from offline_db import OfflineClient

    # motor.motor_asyncio.AsyncIOMotorClient → OfflineClient
    motor_pkg = types.ModuleType("motor")
    motor_asyncio = types.ModuleType("motor.motor_asyncio")
    motor_asyncio.AsyncIOMotorClient = OfflineClient
    motor_pkg.motor_asyncio = motor_asyncio
    sys.modules.setdefault("motor", motor_pkg)
    sys.modules.setdefault("motor.motor_asyncio", motor_asyncio)

    # bson.ObjectId → basit kimlik (offline'da auth kullanılmıyor ama
    # modül import ediliyor)
    bson = types.ModuleType("bson")

    class ObjectId(str):
        def __new__(cls, v=None):
            return super().__new__(cls, v or "offline")

    bson.ObjectId = ObjectId
    sys.modules.setdefault("bson", bson)

    # dotenv → noop (env zaten yukarıda)
    dotenv = types.ModuleType("dotenv")
    dotenv.load_dotenv = lambda *a, **k: None
    sys.modules.setdefault("dotenv", dotenv)

    # bcrypt/jwt → offline'da auth rotaları çağrılmaz; import yeterli
    bcrypt = types.ModuleType("bcrypt")
    bcrypt.gensalt = lambda *a, **k: b"salt"
    bcrypt.hashpw = lambda p, s: b"hash"
    bcrypt.checkpw = lambda a, b: False
    sys.modules.setdefault("bcrypt", bcrypt)
    try:
        import jwt  # pyjwt pure-python ise gerçek paket kullanılır
    except Exception:
        jwt_m = types.ModuleType("jwt")
        jwt_m.encode = lambda payload, key, algorithm=None: "offline-token"
        jwt_m.decode = lambda *a, **k: {}

        class _E(Exception):
            pass

        jwt_m.ExpiredSignatureError = _E
        jwt_m.InvalidTokenError = _E
        sys.modules["jwt"] = jwt_m


_app = None


async def boot():
    """Motoru başlat (idempotent). Dönen değer: rota sayısı."""
    global _app
    if _app is not None:
        return len(_app.routes)
    _install_fakes()
    import server  # mevcut uygulama — değişiklik yok
    _app = server.app
    return len(_app.routes)


async def call(method, path, body_json="", device_id="cihaz", save_slot="1"):
    """Mini ASGI istemcisi — thread'siz, Pyodide-dostu.

    Dönen değer: JSON str: {"status": int, "body": <json|str>}
    """
    assert _app is not None, "önce boot() çağır"
    body = (body_json or "").encode("utf-8")
    headers = [
        (b"host", b"offline"),
        (b"content-type", b"application/json"),
        (b"content-length", str(len(body)).encode()),
        (b"x-device-id", device_id.encode()),
        (b"x-save-slot", str(save_slot).encode()),
        (b"x-lang", b"tr"),
    ]
    raw_path, _, query = path.partition("?")
    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.3"},
        "http_version": "1.1",
        "method": method.upper(),
        "scheme": "http",
        "path": raw_path,
        "raw_path": raw_path.encode(),
        "query_string": query.encode(),
        "headers": headers,
        "client": ("127.0.0.1", 0),
        "server": ("offline", 80),
    }

    sent = {"done": False}
    status = {"code": 500}
    chunks = []

    async def receive():
        if sent["done"]:
            return {"type": "http.disconnect"}
        sent["done"] = True
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message):
        if message["type"] == "http.response.start":
            status["code"] = message["status"]
        elif message["type"] == "http.response.body":
            chunks.append(message.get("body", b""))

    await _app(scope, receive, send)
    text = b"".join(chunks).decode("utf-8", "replace")
    try:
        parsed = json.loads(text)
    except Exception:
        parsed = text
    return json.dumps({"status": status["code"], "body": parsed},
                      ensure_ascii=False)


def export_saves():
    """Tüm kayıtları JSON olarak ver (JS → IndexedDB)."""
    from offline_db import OfflineClient
    return OfflineClient._db.export_json()


def import_saves(raw):
    """IndexedDB'den gelen kayıtları yükle."""
    from offline_db import OfflineClient
    OfflineClient._db.import_json(raw)
    return True
