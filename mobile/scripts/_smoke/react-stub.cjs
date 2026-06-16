// Headless smoke testi için minimal React stub'ı (i18n.tsx modül-yükünü çalıştırır).
const noop = () => {};
module.exports = {
  __esModule: true, default: { createElement: noop },
  createContext: () => ({ Provider: noop, Consumer: noop }),
  useContext: () => null, useEffect: noop, useCallback: (f) => f,
  useState: (v) => [typeof v === "function" ? v() : v, noop],
  useRef: () => ({ current: null }), useMemo: (f) => (typeof f === "function" ? f() : f),
  createElement: noop, Fragment: noop,
};
