import React from "react";

/**
 * ErrorBoundary — "Küllerin Sığınağı"
 * Beklenmedik bir render hatası tüm uygulamayı beyaz ekrana çevirmesin diye
 * son emniyet ağı. Bir alt ağaç çökerse, oyuncuya "Kül & Köz" dilinde nazik
 * bir kurtarma ekranı gösterir: ocağa dön ya da sayfayı tazele.
 *
 * Kapsam: app kökünde (tüm oyun) ve istenirse route düzeyinde kullanılabilir.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Geliştirici günlüğü; oyuncuya gösterilmez.
    // eslint-disable-next-line no-console
    console.error("Beklenmeyen hata yakalandı:", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "2rem 1.5rem", gap: "0.2rem",
        background:
          "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(201,168,76,0.10) 0%, transparent 55%), #0a0703",
      }}>
        <div className="ember-flicker" style={{
          fontSize: "2.4rem", marginBottom: "0.6rem",
          filter: "drop-shadow(0 0 14px rgba(224,90,48,0.5))",
        }}>🔥</div>
        <h1 className="font-display" style={{
          fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.16em",
          color: "var(--color-gold, #C9A84C)", textTransform: "uppercase",
          textShadow: "0 0 24px rgba(201,168,76,0.3)", margin: 0,
        }}>
          Ocak Bir An Söndü
        </h1>
        <p className="font-serif" style={{
          fontStyle: "italic", fontSize: "0.9rem", lineHeight: 1.6,
          color: "var(--color-parchment-muted, #9a8d72)",
          maxWidth: "20rem", margin: "0.7rem 0 1.4rem",
        }}>
          Beklenmedik bir şey oldu, ama hikâyen kayıp değil. Küllerden yeniden
          tutuşturalım.
        </p>
        <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => window.location.reload()} className="btn-ember"
            style={{ padding: "0.7rem 1.3rem", fontSize: "0.7rem", letterSpacing: "0.16em" }}>
            SAYFAYI TAZELE
          </button>
          <button onClick={() => { window.location.href = "/oyun"; }}
            className="btn-ghost-ash"
            style={{ padding: "0.7rem 1.3rem", fontSize: "0.7rem", letterSpacing: "0.16em" }}>
            OCAĞA DÖN
          </button>
        </div>
      </div>
    );
  }
}
