# Kronikler MP — Canlı Entegrasyon Testleri

Deploy edilmiş Cloudflare Worker sunucusuna karşı uçtan uca doğrulama. Node'un
global `WebSocket`'ini kullanır (Node 18+). Her test rastgele bir diyar kodu açar.

- `mp_itest.cjs` — beylik (bey ol/devir) + sosyal (bağış/düello) + sohbet kanalları (14)
- `mp_itest2.cjs` — kalıcılık (çık-gir aynı karakter) + "Seyahate Çık" güvenli yokluk (7)
- `mp_itest3.cjs` — çevrimdışı NPC-vekil: yaşlanma + suikastla ölüm + dönüşte ölü bulma (4)
- `mp_itest4.cjs` — paylaşımlı NPC kütüğü (aynı NPC'ler) + court/turn ilişki (5)
- `mp_itest5.cjs` — ittifak el-sıkışma + ihanet (pakt-bozma) + beylik seferi-ilhak (7)

Çalıştır: `bash server/test/run-all.sh`  ·  Başka sunucu: `MP_URL=wss://... bash server/test/run-all.sh`
