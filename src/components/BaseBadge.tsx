export default function BaseBadge() {
  return (
    <a
      href="https://base.org"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "#0052FF",
        color: "white",
        padding: "10px 14px",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: "500",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        textDecoration: "none",
        zIndex: 1000,
      }}
    >
      Built on Base ⚡
    </a>
  );
}
