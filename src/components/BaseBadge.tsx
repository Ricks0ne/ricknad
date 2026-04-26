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
        zIndex: 1999999,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "transform 0.2s ease",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.transform = "scale(1.05)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.transform = "scale(1)")
      }
    >
      <img
        src="https://avatars.githubusercontent.com/u/108554348?s=200&v=4"
        alt="Base"
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "4px",
        }}
      />
      Built on Base ⚡
    </a>
  );
}
