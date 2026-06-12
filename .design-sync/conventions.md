# Kül & Köz — kullanım sözleşmesi

Provider/wrapper gerekmez. Tema, `styles.css`'teki CSS değişkenleri ve
sınıflardan gelir; sayfa kökünü `class="page-shell rise-in"` ile sar.

**Renk anlamları (TONES):** gold=değer/başarı · ember=risk/aksiyon ·
blood=tehlike/savaş · sage=kazanç · ink=entrika/bilgi · ash=nötr.
Token'lar: `var(--color-bg) --color-card --color-border(-hi)
--color-gold(-bright/-dim) --color-parchment(-dim/-muted)`.

**Tipografi:** başlık/etiket/rakam → `font-display` (Cinzel);
anlatı/açıklama → `font-serif` + italic (Crimson Text). Mikro etiket:
`label-tiny`. Asla anlatıyı Cinzel'le yazma.

**Yerleşim:** her ekran `PageHeader`la açılır; bölümler `Panel`
(title/icon/tone) içinde; listeler `class="row-frame"` satırları;
boş durumlar `EmptyState` (asla çıplak "veri yok"); para her yerde
`Coin`; rozet `Pill`; ayraç `GoldRule`. Birincil eylem butonu:
`class="btn-ember"`; ikincil: `btn-ghost-ash`.

**Örnek:**
```jsx
<div className="page-shell rise-in">
  <PageHeader kicker="Sırtındakiler" icon="🎒" title="Heybe"
    sub="Taşıdıkların hikâyenin kanıtı." right={<Coin value={214}/>} />
  <Panel title="Kuşam" icon="🛡" tone="ember">
    <Stat icon="⚔" label="Saldırı" value="+4" tone="ember" />
    <div className="row-frame">… satır içeriği …</div>
  </Panel>
</div>
```
Dil Türkçe, 1200'ler Anadolu havası; zaman birimi AY (hafta deme).
