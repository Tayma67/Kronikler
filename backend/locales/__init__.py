"""i18n altyapısı — GDD v5 Sürekli Kural #1 + Faz 6A.

Kullanım:
    from locales import t, set_language
    t("uretim.kitlik_etkisi", loc="Dutluca", good="buğday")

- Dil, istek bazında contextvar ile taşınır (async-güvenli).
- Eksik çeviri aktif dilde yoksa Türkçe'ye (kaynak dil) düşer;
  o da yoksa key döner (görünür hata).
- Desteklenen diller: tr (kaynak), en. Faz 6 devamında: de, es, ar (RTL).
"""
import contextvars

from locales.tr import STRINGS as _TR_BASE
from locales.tr_arcs import ARC_STRINGS as _TR_ARCS

_TR = {**_TR_BASE, **_TR_ARCS}

try:
    from locales.en import STRINGS as _EN
except ImportError:
    _EN = {}

LANGUAGES = {"tr": _TR, "en": _EN}
DEFAULT_LANGUAGE = "tr"

_current_lang = contextvars.ContextVar("kronikler_lang", default=DEFAULT_LANGUAGE)


def set_language(lang):
    """İstek bazında dili ayarla (router'lar X-Lang başlığından çağırır)."""
    if lang in LANGUAGES:
        _current_lang.set(lang)
    else:
        _current_lang.set(DEFAULT_LANGUAGE)


def get_language():
    return _current_lang.get()


def t(key, **kwargs):
    """Aktif dilden metin döndürür; eksikse Türkçe'ye, o da yoksa key'e düşer."""
    lang = _current_lang.get()
    table = LANGUAGES.get(lang, _TR)
    text = table.get(key) or _TR.get(key, key)
    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, IndexError):
            return text
    return text
