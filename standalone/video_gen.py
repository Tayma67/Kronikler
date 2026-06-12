# -*- coding: utf-8 -*-
"""
Video üretici — 1080x1920 dikey Shorts.

Görsel dil: koyu zemin, turuncu vurgu, ince çerçeve, serif yazı.
Ses: edge-tts (ücretsiz Microsoft TTS, tr-TR). --silent ile sessiz test.
"""
import asyncio
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
MARGIN = 72

BG = (12, 10, 9)
SURFACE = (28, 25, 23)
PRIMARY = (194, 65, 12)
EMBER = (249, 115, 22)
TEXT = (231, 229, 228)
MUTED = (168, 162, 158)
BORDER = (87, 83, 78)

BRAND = "GÜNDE BİR BİLGİ"   # videoların altındaki kanal yazısı
VOICE = "tr-TR-AhmetNeural"

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif{}.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif{}.ttf",
]


def _font(size, bold=False):
    suffix = "-Bold" if bold else ""
    for tpl in FONT_CANDIDATES:
        p = tpl.format(suffix)
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    raise SystemExit("Serif TTF font bulunamadı (DejaVu/Liberation gerekli).")


def ffmpeg_exe():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def _wrap(draw, text, font, max_w):
    lines, line = [], ""
    for word in text.split():
        cand = f"{line} {word}".strip()
        if draw.textlength(cand, font=font) <= max_w:
            line = cand
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def _base_frame():
    """Koyu zemin + alt parıltı + tane dokusu + ince çerçeve."""
    img = Image.new("RGB", (W, H), BG)

    glow = Image.new("RGB", (W, H), BG)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-W * 0.3, H * 0.78, W * 1.3, H * 1.45], fill=(60, 22, 6))
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    img = Image.blend(img, glow, 0.85)

    noise = Image.effect_noise((W, H), 18).convert("L")
    img = Image.composite(
        Image.new("RGB", (W, H), (40, 36, 33)), img, noise.point(lambda v: v // 14)
    )

    d = ImageDraw.Draw(img)
    d.rectangle([40, 40, W - 40, H - 40], outline=BORDER, width=2)
    for x, y in [(40, 40), (W - 40, 40), (40, H - 40), (W - 40, H - 40)]:
        d.line([x - 18, y, x + 18, y], fill=EMBER, width=3)
        d.line([x, y - 18, x, y + 18], fill=EMBER, width=3)
    return img, d


def _label(d, text, y, color=MUTED):
    f = _font(34, bold=True)
    spaced = " ".join(text)  # harf aralığı hissi
    w = d.textlength(spaced, font=f)
    d.text(((W - w) / 2, y), spaced, font=f, fill=color)


def _brand(d):
    f = _font(30, bold=True)
    text = " ".join(BRAND)
    w = d.textlength(text, font=f)
    d.text(((W - w) / 2, H - 130), text, font=f, fill=MUTED)


def _centered_block(d, text, font, line_h, color, underline=False):
    lines = _wrap(d, text, font, W - 2 * MARGIN)
    y = (H - len(lines) * line_h) / 2 - 60
    for ln in lines:
        w = d.textlength(ln, font=font)
        d.text(((W - w) / 2, y), ln, font=font, fill=color)
        y += line_h
    if underline:
        d.rectangle([(W - 240) / 2, y + 40, (W + 240) / 2, y + 46], fill=PRIMARY)
    return y


def render_frame(segment, path: Path):
    img, d = _base_frame()
    scr = segment["screen"]
    kind = segment["kind"]

    _label(d, scr["label"], 200,
           color=EMBER if kind in ("hook", "cta") else MUTED)

    if kind == "hook":
        _centered_block(d, scr["title"], _font(84, bold=True), 112, TEXT,
                        underline=True)

    elif kind == "reveal":
        _centered_block(d, scr["title"], _font(110, bold=True), 140, EMBER)

    elif kind == "detail":
        f = _font(58)
        lines = _wrap(d, scr["body"], f, W - 2 * MARGIN - 60)
        y = (H - len(lines) * 86) / 2 - 40
        d.rectangle([MARGIN, y - 60, W - MARGIN, y + len(lines) * 86 + 60],
                    fill=SURFACE, outline=BORDER, width=2)
        for ln in lines:
            w = d.textlength(ln, font=f)
            d.text(((W - w) / 2, y), ln, font=f, fill=TEXT)
            y += 86

    elif kind == "cta":
        y = _centered_block(d, scr["body"], _font(88, bold=True), 116, EMBER)
        f2 = _font(46)
        sub = "Takip et — yarın yenisi var ↓"
        w = d.textlength(sub, font=f2)
        d.text(((W - w) / 2, y + 50), sub, font=f2, fill=MUTED)

    _brand(d)
    img.save(path)


async def _tts(text, path: Path):
    import edge_tts
    await edge_tts.Communicate(text, VOICE, rate="-4%").save(str(path))


def make_audio(text, path: Path, silent=False):
    """Bölüm sesi üret; --silent modunda metin uzunluğuna göre sessizlik."""
    if not silent:
        asyncio.run(_tts(text, path))
        return
    dur = max(2.0, len(text) / 14.0)
    subprocess.run(
        [ffmpeg_exe(), "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
         "-t", f"{dur:.2f}", "-q:a", "9", str(path)],
        check=True, capture_output=True,
    )


def audio_duration(path: Path) -> float:
    """ffprobe yok — süreyi ffmpeg stderr'inden oku."""
    r = subprocess.run([ffmpeg_exe(), "-i", str(path)],
                       capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", r.stderr)
    if not m:
        raise RuntimeError(f"Süre okunamadı: {path}")
    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)


def render_video(segments, out_path: Path, silent=False):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    ff = ffmpeg_exe()
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        parts = []
        for i, seg in enumerate(segments):
            frame = tmp / f"frame_{i}.png"
            audio = tmp / f"audio_{i}.mp3"
            part = tmp / f"part_{i}.mp4"
            render_frame(seg, frame)
            make_audio(seg["voice"], audio, silent=silent)
            dur = audio_duration(audio) + 0.5  # nefes payı
            subprocess.run(
                [ff, "-y", "-loop", "1", "-i", str(frame), "-i", str(audio),
                 "-t", f"{dur:.2f}", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                 "-r", "30", "-c:a", "aac", "-b:a", "128k", "-shortest",
                 "-af", "apad", str(part)],
                check=True, capture_output=True,
            )
            parts.append(part)

        concat_list = tmp / "list.txt"
        concat_list.write_text(
            "".join(f"file '{p}'\n" for p in parts), encoding="utf-8"
        )
        subprocess.run(
            [ff, "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list),
             "-c", "copy", str(out_path)],
            check=True, capture_output=True,
        )
    return out_path
