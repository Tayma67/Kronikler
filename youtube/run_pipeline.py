# -*- coding: utf-8 -*-
"""
Tam otomasyon boru hattı: bilgi seç → video üret → YouTube'a yükle → kaydet.

Kullanım:
  python run_pipeline.py                    # rastgele yayınlanmamış bilgi
  python run_pipeline.py --fact-id ahtapot_kalp
  python run_pipeline.py --no-upload        # sadece video üret (test)
  python run_pipeline.py --silent           # TTS yerine sessizlik (sandbox testi)
"""
import argparse
import datetime
from pathlib import Path

import content_source
import video_gen

OUT = Path(__file__).resolve().parent / "out"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fact-id", default=None)
    ap.add_argument("--no-upload", action="store_true")
    ap.add_argument("--silent", action="store_true")
    args = ap.parse_args()

    fact = content_source.pick_fact(args.fact_id)
    print(f"Seçilen bilgi: {fact['id']} — {fact['soru']}")

    segments, metadata = content_source.build_script(fact)
    video_path = OUT / f"{fact['id']}.mp4"
    video_gen.render_video(segments, video_path, silent=args.silent)
    size_mb = video_path.stat().st_size / 1e6
    print(f"Video hazır: {video_path} ({size_mb:.1f} MB)")

    if args.no_upload:
        print("Yükleme atlandı (--no-upload).")
        return

    from upload import upload_video
    video_id = upload_video(video_path, metadata)
    url = f"https://youtube.com/shorts/{video_id}"
    print(f"Yüklendi: {url}")

    today = datetime.date.today().isoformat()
    content_source.mark_published(fact["id"], video_id, today)
    print("published.json güncellendi.")


if __name__ == "__main__":
    main()
