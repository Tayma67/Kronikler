"""i18n altyapısı — GDD v5 Sürekli Kural #1: yeni metin asla hardcode edilmez.

Kullanım:
    from locales import t
    t("uretim.kitlik_etkisi", loc="Dutluca", good="buğday")

Şimdilik tek dil (tr) yüklüdür; Faz 6'da dil seçimi eklenecek.
"""
from locales.tr import STRINGS as _TR
from locales.tr_arcs import ARC_STRINGS as _TR_ARCS

_TR = {**_TR, **_TR_ARCS}
_ACTIVE = _TR


def t(key, **kwargs):
    """Aktif dilden metin döndürür. Key yoksa key'in kendisi döner (görünür hata)."""
    text = _ACTIVE.get(key, key)
    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, IndexError):
            return text
    return text
