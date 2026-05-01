import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

// 🔥 지수님의 파이어베이스 연결 열쇠
const firebaseConfig = {
  apiKey: "AIzaSyCoj5JBfp7eCrulrKum_DYOVggUOLwwTog",
  authDomain: "lunch-app-571d3.firebaseapp.com",
  projectId: "lunch-app-571d3",
  storageBucket: "lunch-app-571d3.firebasestorage.app",
  messagingSenderId: "168369980043",
  appId: "1:168369980043:web:3fc18a8148cc3128d64a8e",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ─── 로컬스토리지 훅 ─── */
function useLS(key, def) {
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : def;
    } catch {
      return def;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  }, [key, v]);
  return [v, setV];
}

/* ─── 기본 데이터 ─── */
const DEF_CATS = [
  {
    id: "c1",
    name: "한식",
    emoji: "🍲",
    sub: ["한정식", "분식", "국물류", "기타"],
  },
  {
    id: "c2",
    name: "양식",
    emoji: "🍝",
    sub: ["햄버거", "피자", "파스타", "멕시칸", "브런치", "기타"],
  },
  {
    id: "c3",
    name: "일식",
    emoji: "🍣",
    sub: [
      "라멘",
      "카레",
      "덮밥",
      "오코노미야끼",
      "우동",
      "돈까스",
      "샤브샤브",
      "소바",
      "기타",
    ],
  },
  { id: "c4", name: "중식", emoji: "🥟", sub: ["마라탕", "기타"] },
  {
    id: "c5",
    name: "샐러드/샌드위치",
    emoji: "🥗",
    sub: ["샐러드", "샌드위치", "기타"],
  },
  { id: "c6", name: "아시안", emoji: "🍜", sub: ["베트남", "인도"] },
  { id: "c7", name: "카페", emoji: "☕", sub: [] },
];
const DEF_RESTS = [
  {
    id: 1,
    cat: "c1",
    sub: "국물류",
    name: "맛있는 감자탕",
    mapUrl: "https://naver.me/example1",
    reviews: [
      { id: 1, text: "직화 감자탕 진짜 맛있어요!", author: "민준", rating: 5 },
      { id: 2, text: "국물이 깊고 진해요", author: "수연", rating: 4 },
    ],
  },
  {
    id: 2,
    cat: "c1",
    sub: "분식",
    name: "황금 떡볶이",
    mapUrl: "",
    reviews: [{ id: 3, text: "매콤달콤 최고", author: "지영", rating: 4 }],
  },
  {
    id: 3,
    cat: "c2",
    sub: "파스타",
    name: "파스타 공방",
    mapUrl: "https://naver.me/example3",
    reviews: [
      { id: 4, text: "크림파스타 진짜 맛있음", author: "나연", rating: 5 },
    ],
  },
  {
    id: 4,
    cat: "c3",
    sub: "라멘",
    name: "라멘 장인",
    mapUrl: "https://naver.me/example4",
    reviews: [
      { id: 5, text: "돈코츠 라멘 끝내줘요", author: "상훈", rating: 4 },
      { id: 6, text: "퀄리티 최고예요", author: "태호", rating: 5 },
    ],
  },
  {
    id: 5,
    cat: "c2",
    sub: "햄버거",
    name: "버거 브라더스",
    mapUrl: "",
    reviews: [],
  },
  {
    id: 6,
    cat: "c4",
    sub: "마라탕",
    name: "홍콩마라탕",
    mapUrl: "https://naver.me/example6",
    reviews: [{ id: 7, text: "마라향 제대로!", author: "재원", rating: 4 }],
  },
];

/* ─── 컬러 토큰 ─── */
const C = {
  bg: "#f7f7f7",
  card: "#ffffff",
  ink: "#181c22",
  gray: "#b8b8b9",
  lightbg: "#f7f7f7",
  point: "#e7f63c",
  border: "#e2e2e2",
  muted: "#b8b8b9",
};
const R = 10; // 코너 라운딩 통일값

/* ─── 별점 ─── */
function Stars({ value, onRate, size = 13 }) {
  const [hov, setHov] = useState(0);
  const n = Math.round(hov || value || 0);
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= n ? C.point : "none"}
          stroke={i <= n ? C.point : C.gray}
          strokeWidth="1.8"
          style={{
            cursor: onRate ? "pointer" : "default",
            display: "block",
            flexShrink: 0,
          }}
          onMouseEnter={() => onRate && setHov(i)}
          onMouseLeave={() => onRate && setHov(0)}
          onClick={() => onRate?.(i)}
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </span>
  );
}

function avgRating(reviews) {
  if (!reviews?.length) return null;
  return (
    reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
  ).toFixed(1);
}

/* ─── 컨페티 ─── */
function Confetti({ active }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cancelAnimationFrame(animRef.current);

    if (!active) return;

    const W = (canvas.width = canvas.offsetWidth);
    const H = (canvas.height = canvas.offsetHeight);

    const colors = [C.point, "#ffffff", C.ink, "#a8e63c", "#f0ff70"];
    const particles = Array.from({ length: 120 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 60,
      y: H / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 16 - 4,
      r: Math.random() * 5 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.4,
      shape: Math.random() > 0.5 ? "rect" : "circle",
      life: 1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.55;
        p.vx *= 0.97;
        p.rot += p.spin;
        p.life -= 0.018;
        if (p.life <= 0) return;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.shape === "rect") ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      if (alive) animRef.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, W, H);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ctx.clearRect(0, 0, W, H);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10,
        borderRadius: R,
      }}
    />
  );
}

/* ─── 모달 ─── */
function Modal({ title, onClose, width = 480, children }) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(24,28,34,.35)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: R,
          padding: "28px 30px",
          width,
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,.14)",
          animation: "fu .2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 16, color: C.ink }}>
            {title}
          </span>
          <button onClick={onClose} style={iBtn()}>
            <IcX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── 공통 스타일 헬퍼 ─── */
const iBtn = (active) => ({
  width: 32,
  height: 32,
  borderRadius: R,
  border: "none",
  background: active ? C.point : "transparent",
  color: C.ink,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "background .15s",
  flexShrink: 0,
});
const fieldLbl = {
  fontSize: 11,
  fontWeight: 600,
  color: C.muted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 5,
};
const inp = (extra = {}) => ({
  border: `1.5px solid ${C.border}`,
  borderRadius: R,
  padding: "9px 13px",
  fontSize: 13.5,
  outline: "none",
  fontFamily: "inherit",
  background: C.card,
  color: C.ink,
  width: "100%",
  ...extra,
});

/* ─── 아이콘 ─── */
const IcMap = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
  >
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);
const IcEdit = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IcTrash = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1.5 13.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const IcX = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IcPlus = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IcChev = ({ open }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    style={{
      transform: open ? "rotate(180deg)" : "none",
      transition: "transform .2s",
      display: "block",
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IcGear = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IcDrag = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="4" y1="10" x2="20" y2="10" />
    <line x1="4" y1="14" x2="20" y2="14" />
  </svg>
); // 가로선 두 개로 변경됨

/* ─── 카테고리 사이드 아이템 ─── */
function CatSideItem({ cat, rests, selCat, selSub, onCat, onSub }) {
  const [open, setOpen] = useState(false);
  const isActive = selCat === cat.id;
  const count = rests.filter((r) => r.cat === cat.id).length;

  return (
    <div style={{ marginBottom: 1 }}>
      <button
        onClick={() => {
          onCat(cat.id);
          if (cat.sub.length) setOpen((o) => !o);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: "6px 10px",
          borderRadius: R,
          border: "none",
          background: isActive && selSub === "all" ? "#e8e8e8" : "transparent",
          cursor: "pointer",
          gap: 8,
          transition: "background .15s",
          fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: 16 }}>{cat.emoji}</span>
        <span
          style={{
            flex: 1,
            textAlign: "left",
            fontWeight: isActive ? 600 : 400,
            fontSize: 13.5,
            color: C.ink,
          }}
        >
          {cat.name}
        </span>
        <span
          style={{
            fontSize: 11.5,
            color: isActive && selSub === "all" ? C.ink : C.muted,
            marginRight: cat.sub.length ? 4 : 0,
          }}
        >
          {count}
        </span>
        {cat.sub.length > 0 && (
          <span style={{ color: C.muted }}>
            <IcChev open={open} />
          </span>
        )}
      </button>

      {open &&
        cat.sub.map((sub) => {
          const subActive = isActive && selSub === sub;
          const sc = rests.filter(
            (r) => r.cat === cat.id && r.sub === sub
          ).length;
          return (
            <button
              key={sub}
              onClick={() => {
                onCat(cat.id);
                onSub(sub);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                padding: "6px 10px 6px 36px",
                borderRadius: R,
                border: "none",
                background: subActive ? "#f0f0ee" : "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background .15s",
              }}
            >
              <span
                style={{
                  flex: 1,
                  textAlign: "left",
                  fontSize: 12.5,
                  fontWeight: subActive ? 600 : 400,
                  color: subActive ? C.ink : C.muted,
                }}
              >
                {sub}
              </span>
              <span style={{ fontSize: 11, color: C.gray }}>{sc}</span>
            </button>
          );
        })}
    </div>
  );
}

/* ─── 카테고리 관리 모달 ─── */
function ManageCatsModal({ cats, setCats, onClose }) {
  const [editing, setEditing] = useState(null);
  const [addingCat, setAddingCat] = useState(false);
  const [addingSubFor, setAddingSubFor] = useState(null);
  const [newName, setNewName] = useState("");

  // HTML5 Drag & Drop States
  const [dragCat, setDragCat] = useState(null);
  const [dragSub, setDragSub] = useState(null);

  const EMOJIS = [
    "🍲",
    "🍝",
    "🍣",
    "🥟",
    "🥗",
    "🍜",
    "☕",
    "🍕",
    "🥩",
    "🍛",
    "🍤",
    "🥪",
    "🍱",
    "🫕",
    "🍺",
    "🧆",
  ];
  const [selEmoji, setSelEmoji] = useState("🍽️");

  const saveEditName = () => {
    if (!newName.trim()) return;
    if (editing.type === "cat") {
      setCats((p) =>
        p.map((c) =>
          c.id === editing.catId ? { ...c, name: newName.trim() } : c
        )
      );
    } else {
      setCats((p) =>
        p.map((c) =>
          c.id === editing.catId
            ? {
                ...c,
                sub: c.sub.map((s, i) =>
                  i === editing.subIdx ? newName.trim() : s
                ),
              }
            : c
        )
      );
    }
    setEditing(null);
    setNewName("");
  };

  const delCat = (id) => setCats((p) => p.filter((c) => c.id !== id));
  const delSub = (catId, idx) =>
    setCats((p) =>
      p.map((c) =>
        c.id === catId ? { ...c, sub: c.sub.filter((_, i) => i !== idx) } : c
      )
    );

  const addCat = () => {
    if (!newName.trim()) return;
    setCats((p) => [
      ...p,
      { id: "c" + Date.now(), name: newName.trim(), emoji: selEmoji, sub: [] },
    ]);
    setNewName("");
    setAddingCat(false);
  };
  const addSub = (catId) => {
    if (!newName.trim()) return;
    setCats((p) =>
      p.map((c) =>
        c.id === catId ? { ...c, sub: [...c.sub, newName.trim()] } : c
      )
    );
    setNewName("");
    setAddingSubFor(null);
  };

  // Drag Handlers
  const handleDropCat = (toIdx) => {
    if (dragCat === null || dragCat === toIdx) return;
    setCats((p) => {
      const a = [...p];
      const [item] = a.splice(dragCat, 1);
      a.splice(toIdx, 0, item);
      return a;
    });
    setDragCat(null);
  };

  const handleDropSub = (catId, toIdx) => {
    if (!dragSub || dragSub.catId !== catId || dragSub.idx === toIdx) return;
    setCats((p) =>
      p.map((c) => {
        if (c.id === catId) {
          const a = [...c.sub];
          const [item] = a.splice(dragSub.idx, 1);
          a.splice(toIdx, 0, item);
          return { ...c, sub: a };
        }
        return c;
      })
    );
    setDragSub(null);
  };

  return (
    <Modal title="카테고리 관리" onClose={onClose} width={520}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cats.map((cat, ci) => (
          <div
            key={cat.id}
            style={{
              border: `1.5px solid ${C.border}`,
              borderRadius: R,
              overflow: "hidden",
              opacity: dragCat === ci ? 0.4 : 1,
            }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              setDragCat(ci);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDropCat(ci);
            }}
            onDragEnd={() => setDragCat(null)}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 12px",
                background: "#fafafa",
                gap: 8,
              }}
            >
              <span style={{ color: C.gray, cursor: "grab", display: "flex" }}>
                <IcDrag />
              </span>
              <span style={{ fontSize: 18 }}>{cat.emoji}</span>
              {editing?.type === "cat" && editing.catId === cat.id ? (
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEditName();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  style={{
                    ...inp(),
                    flex: 1,
                    padding: "4px 8px",
                    fontSize: 13.5,
                  }}
                />
              ) : (
                <span
                  style={{
                    flex: 1,
                    fontWeight: 600,
                    fontSize: 14,
                    color: C.ink,
                  }}
                >
                  {cat.name}
                </span>
              )}
              <div style={{ display: "flex", gap: 4 }}>
                {/* 수정/삭제 아이콘 색상 그레이(C.muted)로 변경 */}
                <button
                  onClick={() => {
                    setEditing({ type: "cat", catId: cat.id });
                    setNewName(cat.name);
                  }}
                  style={{ ...iBtn(), color: C.muted }}
                >
                  <IcEdit />
                </button>
                <button
                  onClick={() => delCat(cat.id)}
                  style={{ ...iBtn(), color: C.muted }}
                >
                  <IcTrash />
                </button>
              </div>
            </div>

            {/* 항상 펼쳐져 있도록 조건문 제거 */}
            <div style={{ padding: "6px 12px 10px 36px", background: C.card }}>
              {cat.sub.map((sub, si) => (
                <div
                  key={si}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "5px 0",
                    gap: 6,
                    opacity:
                      dragSub?.catId === cat.id && dragSub?.idx === si
                        ? 0.4
                        : 1,
                  }}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.effectAllowed = "move";
                    setDragSub({ catId: cat.id, idx: si });
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDropSub(cat.id, si);
                  }}
                  onDragEnd={(e) => {
                    e.stopPropagation();
                    setDragSub(null);
                  }}
                >
                  <span
                    style={{ color: C.gray, cursor: "grab", display: "flex" }}
                  >
                    <IcDrag />
                  </span>
                  {editing?.type === "sub" &&
                  editing.catId === cat.id &&
                  editing.subIdx === si ? (
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditName();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      style={{
                        ...inp(),
                        flex: 1,
                        padding: "4px 8px",
                        fontSize: 13,
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: C.ink,
                        fontWeight: 400,
                      }}
                    >
                      {sub}
                    </span>
                  )}
                  <div style={{ display: "flex", gap: 3 }}>
                    {/* 하위 카테고리 수정/삭제 아이콘 색상 그레이(C.muted)로 변경 */}
                    <button
                      onClick={() => {
                        setEditing({ type: "sub", catId: cat.id, subIdx: si });
                        setNewName(sub);
                      }}
                      style={{
                        ...iBtn(),
                        width: 26,
                        height: 26,
                        color: C.muted,
                      }}
                    >
                      <IcEdit />
                    </button>
                    <button
                      onClick={() => delSub(cat.id, si)}
                      style={{
                        ...iBtn(),
                        width: 26,
                        height: 26,
                        color: C.muted,
                      }}
                    >
                      <IcTrash />
                    </button>
                  </div>
                </div>
              ))}
              {addingSubFor === cat.id ? (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input
                    autoFocus
                    placeholder="하위 카테고리명"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSub(cat.id)}
                    style={{
                      ...inp(),
                      flex: 1,
                      padding: "6px 10px",
                      fontSize: 13,
                    }}
                  />
                  <button
                    onClick={() => addSub(cat.id)}
                    style={{
                      background: C.ink,
                      color: "#fff",
                      border: "none",
                      borderRadius: R,
                      padding: "0 12px",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    추가
                  </button>
                  <button
                    onClick={() => {
                      setAddingSubFor(null);
                      setNewName("");
                    }}
                    style={{
                      background: C.lightbg,
                      border: "none",
                      borderRadius: R,
                      padding: "0 10px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      color: C.muted,
                    }}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingSubFor(cat.id);
                    setNewName("");
                  }}
                  style={{
                    marginTop: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "none",
                    border: `1.5px dashed ${C.border}`,
                    borderRadius: R,
                    padding: "5px 10px",
                    cursor: "pointer",
                    color: C.muted,
                    fontSize: 12.5,
                    fontFamily: "inherit",
                  }}
                >
                  <IcPlus /> 하위 카테고리 추가
                </button>
              )}
            </div>
          </div>
        ))}

        {addingCat ? (
          <div
            style={{
              border: `1.5px solid ${C.point}`,
              borderRadius: R,
              padding: "14px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              이모지
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 5,
                marginBottom: 10,
              }}
            >
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  onClick={() => setSelEmoji(em)}
                  style={{
                    fontSize: 18,
                    background: selEmoji === em ? "#f0ffa0" : C.lightbg,
                    border: `2px solid ${
                      selEmoji === em ? C.point : "transparent"
                    }`,
                    borderRadius: R,
                    padding: "4px 6px",
                    cursor: "pointer",
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <input
                autoFocus
                placeholder="카테고리 이름"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCat()}
                style={{ ...inp(), flex: 1 }}
              />
              <button
                onClick={addCat}
                style={{
                  background: C.ink,
                  color: "#fff",
                  border: "none",
                  borderRadius: R,
                  padding: "0 14px",
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                추가
              </button>
              <button
                onClick={() => {
                  setAddingCat(false);
                  setNewName("");
                }}
                style={{
                  background: C.lightbg,
                  border: "none",
                  borderRadius: R,
                  padding: "0 12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: C.muted,
                }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setAddingCat(true);
              setNewName("");
              setSelEmoji("🍽️");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "11px",
              background: C.card,
              border: `1.5px dashed ${C.border}`,
              borderRadius: R,
              cursor: "pointer",
              color: C.muted,
              fontSize: 13.5,
              fontFamily: "inherit",
              fontWeight: 400,
            }}
          >
            <IcPlus /> 카테고리 추가
          </button>
        )}
      </div>
    </Modal>
  );
}

/* ─── 메인 앱 ─── */
export default function App() {
  const [cats, setCats] = useLS("lc_cats5", DEF_CATS);
  const [rests, setRests] = useLS("lc_rests5", DEF_RESTS);

  const [selCat, setSelCat] = useState("all");
  const [selSub, setSelSub] = useState("all");
  const [selId, setSelId] = useState(null);

  const [modal, setModal] = useState(null);
  const [md, setMd] = useState(null);

  const [confettiKey, setConfettiKey] = useState(0);
  const [confettiActive, setConfettiActive] = useState(false);
  const [pick, setPick] = useState(null);
  const [pickType, setPickType] = useState(null);
  const [pickAnim, setPickAnim] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const [rForm, setRForm] = useState({
    name: "",
    cat: "",
    sub: "",
    mapUrl: "",
  });
  const [revForm, setRevForm] = useState({ text: "", author: "", rating: 5 });

  const catOf = (id) => cats.find((c) => c.id === id);
  const filtered = rests.filter((r) => {
    if (selCat !== "all" && r.cat !== selCat) return false;
    if (selSub !== "all" && r.sub !== selSub) return false;
    return true;
  });
  const selected = selId ? rests.find((r) => r.id === selId) : null;

  /* 랜덤 추천 */
  const doRandom = (type) => {
    const pool = type === "cat" ? cats : filtered;
    if (!pool.length || spinning) return;
    setSpinning(true);
    setPick(null);
    setPickAnim(false);
    setPickType(type);
    let c = 0;
    const iv = setInterval(() => {
      setPick(pool[Math.floor(Math.random() * pool.length)]);
      if (++c > 16) {
        clearInterval(iv);
        setSpinning(false);
        setPickAnim(true);
        setConfettiKey((k) => k + 1);
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 2200);
      }
    }, 70);
  };

  /* CRUD */
  const saveRest = () => {
    if (!rForm.name.trim()) return;
    if (md?.id)
      setRests((p) => p.map((r) => (r.id === md.id ? { ...r, ...rForm } : r)));
    else setRests((p) => [...p, { id: Date.now(), ...rForm, reviews: [] }]);
    setModal(null);
    setMd(null);
  };
  const delRest = (id) => {
    setRests((p) => p.filter((r) => r.id !== id));
    if (selId === id) setSelId(null);
    setModal(null);
    setMd(null);
  };

  const addReview = () => {
    if (!revForm.text.trim() || !selId) return;
    const author = revForm.author.trim() || "익명";
    setRests((p) =>
      p.map((r) =>
        r.id === selId
          ? {
              ...r,
              reviews: [
                ...r.reviews,
                {
                  id: Date.now(),
                  text: revForm.text.trim(),
                  author,
                  rating: revForm.rating,
                },
              ],
            }
          : r
      )
    );
    setRevForm({ text: "", author: "", rating: 5 });
  };
  const delReview = (rid, revId) =>
    setRests((p) =>
      p.map((r) =>
        r.id === rid
          ? { ...r, reviews: r.reviews.filter((rv) => rv.id !== revId) }
          : r
      )
    );

  const listTitle =
    selCat === "all"
      ? "전체 맛집"
      : selSub !== "all"
      ? `${catOf(selCat)?.name} · ${selSub}`
      : catOf(selCat)?.name || "맛집";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily:
          "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
        fontWeight: 400,
      }}
    >
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fu { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pi { 0%{transform:scale(.85);opacity:.2} 65%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
        input:focus, select:focus, textarea:focus { border-color: ${C.point} !important; outline: none; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
        .row-hover:hover { background: #f8f8f8 !important; }
        .main-grid {
          display: grid;
          grid-template-columns: 260px 1fr 360px;
          column-gap: 0;
          row-gap: 16px;
          padding: 80px 16px 80px 48px; 
          max-width: 1360px;
          margin: 0 auto;
          height: 100vh;
          align-items: start;
        }
        .left-panel { padding-right: 60px; }
        .center-panel { margin-right: 10px; } /* 중앙-우측 패널 간격 16px로 조정 (기존 24px의 2/3) */
        @media (max-width: 1000px) {
          .main-grid {
            grid-template-columns: 240px 1fr;
            grid-template-rows: auto auto;
            height: auto;
            min-height: 100vh;
          }
          .center-panel { margin-right: 0; }
          .right-panel {
            grid-column: 2;
            grid-row: 2;
          }
        }
        @media (max-width: 700px) {
          .main-grid {
            grid-template-columns: 1fr;
            padding: 16px;
          }
          .left-panel { position: static !important; padding-right: 0; }
          .center-panel { margin-right: 0; }
          .right-panel { grid-column: 1; grid-row: 3; }
        }
      `}</style>

      {/* ── 루트 레이아웃: 3분할, 뷰포트 높이 고정 ── */}
      <div className="main-grid">
        {/* ══ 왼쪽 패널 (고정) ══ */}
        <div
          className="left-panel"
          style={{
            position: "sticky",
            top: 40,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {/* 타이틀 영역 */}
          <div style={{ marginBottom: 36 }}>
            <h1
              style={{
                fontSize: 40,
                fontWeight: 200,
                color: C.ink,
                letterSpacing: -1,
                lineHeight: 1.2,
                marginBottom: 8,
              }}
            >
              점심
              <br />뭐 먹지?
            </h1>
            <div
              style={{
                fontSize: 13,
                fontWeight: 200,
                color: C.gray,
                letterSpacing: -0.3,
              }}
            >
              팔로미노 맛집 아카이브
            </div>
          </div>

          {/* 랜덤 추천 */}
          <div style={{ marginBottom: 20 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 400,
                color: C.ink,
                letterSpacing: 0.2,
                display: "block",
                marginBottom: 10,
              }}
            >
              랜덤 추천
            </span>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => doRandom("rest")}
                disabled={spinning}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "16px",
                  background: C.point,
                  border: "none",
                  borderRadius: R,
                  fontWeight: 600,
                  fontSize: 13,
                  color: C.ink,
                  cursor: spinning ? "not-allowed" : "pointer",
                  marginBottom: 8,
                  fontFamily: "inherit",
                  opacity: spinning ? 0.7 : 1,
                  transition: "opacity .15s",
                }}
              >
                맛집 골라줘
              </button>
              <button
                onClick={() => doRandom("cat")}
                disabled={spinning}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "16px",
                  background: C.ink,
                  border: "none",
                  borderRadius: R,
                  fontWeight: 500,
                  fontSize: 13,
                  color: "#fff",
                  cursor: spinning ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: spinning ? 0.7 : 1,
                  transition: "opacity .15s",
                }}
              >
                카테고리 골라줘
              </button>
            </div>

            {/* 랜덤 결과 */}
            <div
              style={{
                marginTop: 10,
                borderRadius: R,
                height: 110,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {pick ? (
                <div
                  style={{
                    borderRadius: R,
                    padding: "12px 14px",
                    background: C.card,
                    border: `1.5px solid ${pickAnim ? C.point : C.border}`,
                    animation: pickAnim ? "pi .3s ease" : "none",
                    transition: "border-color .25s",
                    cursor: pickType === "rest" ? "pointer" : "default",
                    position: "absolute",
                    inset: 0,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                  onClick={() => {
                    if (pickType === "rest") setSelId(pick.id);
                  }}
                >
                  <Confetti key={confettiKey} active={confettiActive} />
                  {pickType === "rest" ? (
                    <>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14.5,
                          color: C.ink,
                          marginBottom: 3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {pick.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: C.muted,
                          marginBottom: 8,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {catOf(pick.cat)?.emoji} {catOf(pick.cat)?.name}
                        {pick.sub ? ` · ${pick.sub}` : ""}
                      </div>
                      {pick.mapUrl ? (
                        <a
                          href={pick.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: C.point,
                            color: C.ink,
                            borderRadius: R,
                            padding: "4px 10px",
                            fontSize: 11.5,
                            fontWeight: 600,
                            textDecoration: "none",
                            alignSelf: "flex-start",
                          }}
                        >
                          <IcMap /> 네이버 지도
                        </a>
                      ) : (
                        <div style={{ height: 24 }} />
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 20, marginBottom: 3 }}>
                        {pick.emoji}
                      </div>
                      <div
                        style={{ fontWeight: 600, fontSize: 14, color: C.ink }}
                      >
                        {pick.name}
                      </div>
                      <div
                        style={{ fontSize: 12, color: C.muted, marginTop: 2 }}
                      >
                        {rests.filter((r) => r.cat === pick.id).length}개 맛집
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    borderRadius: R,
                    position: "absolute",
                    inset: 0,
                    background: C.card,
                    border: `1.5px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: C.muted }}>
                    결과가 여기에 표시돼요
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 카테고리 */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: C.ink,
                  letterSpacing: 0.2,
                }}
              >
                카테고리
              </span>
              <button
                onClick={() => setModal("manageCats")}
                style={{ ...iBtn(), width: 28, height: 28, color: C.muted }}
                title="카테고리 관리"
              >
                <IcGear />
              </button>
            </div>

            {/* 전체 버튼 */}
            <button
              onClick={() => {
                setSelCat("all");
                setSelSub("all");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                padding: "6px 10px",
                borderRadius: R,
                border: "none",
                background: selCat === "all" ? "#e8e8e8" : "transparent",
                cursor: "pointer",
                gap: 8,
                fontFamily: "inherit",
                marginBottom: 2,
                transition: "background .15s",
              }}
            >
              <span style={{ fontSize: 16 }}>🍽️</span>
              <span
                style={{
                  flex: 1,
                  textAlign: "left",
                  fontWeight: selCat === "all" ? 600 : 400,
                  fontSize: 13.5,
                  color: C.ink,
                }}
              >
                전체
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  color: selCat === "all" ? C.ink : C.muted,
                }}
              >
                {rests.length}
              </span>
            </button>

            {cats.map((cat) => (
              <CatSideItem
                key={cat.id}
                cat={cat}
                rests={rests}
                selCat={selCat}
                selSub={selSub}
                onCat={(id) => {
                  setSelCat(id);
                  setSelSub("all");
                }}
                onSub={setSelSub}
              />
            ))}
          </div>
        </div>

        {/* ══ 가운데 패널 (스크롤 독립) ══ */}
        <div
          className="center-panel"
          style={{
            background: C.card,
            borderRadius: R,
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 80px)",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 20px",
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 400, fontSize: 14, color: C.ink }}>
              {listTitle}
            </span>
            <button
              onClick={() => {
                setRForm({
                  name: "",
                  cat: cats[0]?.id || "",
                  sub: "",
                  mapUrl: "",
                });
                setModal("addRest");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: C.ink,
                color: "#fff",
                border: "none",
                borderRadius: R,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <IcPlus /> 맛집 추가
            </button>
          </div>

          {/* 리스트 스크롤 영역 */}
          <div style={{ overflowY: "auto", flex: 1, padding: "2px 8px" }}>
            {filtered.length === 0 && (
              <div
                style={{
                  padding: "60px 20px",
                  textAlign: "center",
                  color: C.gray,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🍽️</div>
                <div style={{ fontSize: 13 }}>등록된 맛집이 없어요</div>
              </div>
            )}
            {filtered.map((r, i) => {
              const cat = catOf(r.cat);
              const ar = avgRating(r.reviews);
              const isSel = selId === r.id;
              return (
                <div key={r.id}>
                  <div
                    className="row-hover"
                    onClick={() => setSelId(isSel ? null : r.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 12px",
                      borderRadius: R,
                      cursor: "pointer",
                      background: isSel ? "#f8ffd8" : "transparent",
                      transition: "background .15s",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: R,
                        background: isSel ? "#eeffa0" : C.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        flexShrink: 0,
                      }}
                    >
                      {cat?.emoji || "🍽️"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: C.ink,
                          marginBottom: 4,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {r.name}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Stars value={parseFloat(ar || 0)} size={12} />
                        <span style={{ fontSize: 12, color: C.muted }}>
                          {ar || "—"}
                        </span>
                        <span style={{ fontSize: 11.5, color: C.gray }}>
                          ({r.reviews.length})
                        </span>
                        {r.sub && (
                          <span
                            style={{
                              fontSize: 10,
                              color: C.muted,
                              background: "transparent",
                              border: `1px solid ${C.gray}`,
                              borderRadius: 5,
                              padding: "1px 4px",
                              whiteSpace: "nowrap",
                              display: "inline-block",
                              maxWidth: "100%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {r.sub}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        title={r.mapUrl ? "지도 보기" : "링크 없음"}
                        onClick={(e) => {
                          e.stopPropagation();
                          r.mapUrl && window.open(r.mapUrl, "_blank");
                        }}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: R,
                          border: "none",
                          background: r.mapUrl ? C.point : C.lightbg,
                          color: r.mapUrl ? C.ink : C.gray,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: r.mapUrl ? "pointer" : "default",
                          transition: "background .15s",
                        }}
                      >
                        <IcMap />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRForm({
                            name: r.name,
                            cat: r.cat,
                            sub: r.sub,
                            mapUrl: r.mapUrl || "",
                          });
                          setModal("editRest");
                          setMd(r);
                        }}
                        style={{
                          ...iBtn(),
                          width: 30,
                          height: 30,
                          color: C.muted,
                        }}
                      >
                        <IcEdit />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModal("delRest");
                          setMd(r);
                        }}
                        style={{
                          ...iBtn(),
                          width: 30,
                          height: 30,
                          color: "#e44",
                        }}
                      >
                        <IcTrash />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ 오른쪽 패널 (고정) ══ */}
        <div className="right-panel" style={{ position: "sticky", top: 40 }}>
          {selected ? (
            <div
              style={{
                background: C.card,
                borderRadius: R,
                overflow: "hidden",
                animation: "fu .2s ease",
                maxHeight: "calc(100vh - 80px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* 맛집 헤더 */}
              <div
                style={{
                  padding: "20px 20px 16px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 20,
                        color: C.ink,
                        marginBottom: 8,
                      }}
                    >
                      {selected.name}
                    </div>

                    {/* 우측 패널 카테고리 태그 둥글기 및 패딩 중앙과 동일하게 수정 */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span
                        style={{
                          background: "transparent",
                          border: `1px solid ${C.gray}`,
                          color: C.muted,
                          borderRadius: 6,
                          padding: "1px 7px",
                          fontSize: 11.5,
                          fontWeight: 400,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {catOf(selected.cat)?.emoji} {catOf(selected.cat)?.name}
                      </span>
                      {selected.sub && (
                        <span
                          style={{
                            background: "transparent",
                            border: `1px solid ${C.gray}`,
                            color: C.muted,
                            borderRadius: 6,
                            padding: "1px 7px",
                            fontSize: 11.5,
                            fontWeight: 400,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {selected.sub}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => {
                        setRForm({
                          name: selected.name,
                          cat: selected.cat,
                          sub: selected.sub,
                          mapUrl: selected.mapUrl || "",
                        });
                        setModal("editRest");
                        setMd(selected);
                      }}
                      style={{
                        ...iBtn(),
                        width: 28,
                        height: 28,
                        color: C.muted,
                      }}
                    >
                      <IcEdit />
                    </button>
                    <button
                      onClick={() => {
                        setModal("delRest");
                        setMd(selected);
                      }}
                      style={{
                        ...iBtn(),
                        width: 28,
                        height: 28,
                        color: "#e44",
                      }}
                    >
                      <IcTrash />
                    </button>
                    <button
                      onClick={() => setSelId(null)}
                      style={{
                        ...iBtn(),
                        width: 28,
                        height: 28,
                        color: C.muted,
                      }}
                    >
                      <IcX />
                    </button>
                  </div>
                </div>

                {/* 평균 별점 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 20,
                  }}
                >
                  <Stars
                    value={parseFloat(avgRating(selected.reviews) || 0)}
                    size={16}
                  />
                  <span style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>
                    {avgRating(selected.reviews) || "—"}
                  </span>
                  <span style={{ fontSize: 12, color: C.muted }}>
                    {selected.reviews.length}개 리뷰
                  </span>
                </div>

                {/* 네이버 지도 */}
                {selected.mapUrl ? (
                  <a
                    href={selected.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      background: C.point,
                      color: C.ink,
                      borderRadius: R,
                      padding: "9px 16px",
                      fontSize: 13.5,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <IcMap /> 네이버 지도
                  </a>
                ) : (
                  <div
                    style={{
                      background: C.bg,
                      borderRadius: R,
                      padding: "9px 14px",
                      color: C.gray,
                      fontSize: 13,
                      display: "inline-block",
                    }}
                  >
                    지도 링크 없음
                  </div>
                )}
              </div>

              {/* 리뷰 목록 + 작성 (스크롤 가능) */}
              <div style={{ overflowY: "auto", flex: 1, padding: "20px 20px" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 15,
                  }}
                >
                  리뷰
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {selected.reviews.length === 0 ? (
                    <div
                      style={{
                        color: C.gray,
                        fontSize: 13,
                        padding: "14px 0",
                        textAlign: "center",
                      }}
                    >
                      첫 리뷰를 남겨보세요!
                    </div>
                  ) : (
                    selected.reviews.map((rv, i) => (
                      <div
                        key={rv.id || i}
                        style={{
                          background: "#fff",
                          border: `1px solid ${C.border}`,
                          borderRadius: R,
                          padding: "11px 14px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 7,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                            }}
                          >
                            <Stars value={rv.rating || 0} size={13} />
                            <span
                              style={{
                                fontWeight: 500,
                                fontSize: 12,
                                color: C.gray,
                              }}
                            >
                              {rv.author}
                            </span>
                          </div>
                          <button
                            onClick={() => delReview(selected.id, rv.id || i)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: C.gray,
                              display: "flex",
                              padding: 2,
                            }}
                          >
                            <IcX />
                          </button>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: C.ink,
                            lineHeight: 1.5,
                            fontWeight: 300,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {rv.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 리뷰 입력 */}
                <div
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: R,
                    padding: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: C.muted,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 15,
                    }}
                  >
                    리뷰 남기기
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 15,
                      marginBottom: 8,
                      alignItems: "center",
                    }}
                  >
                    <input
                      placeholder="이름"
                      value={revForm.author}
                      onChange={(e) =>
                        setRevForm((p) => ({ ...p, author: e.target.value }))
                      }
                      style={{
                        ...inp(),
                        width: 100,
                        flex: "none",
                        fontSize: 13,
                        padding: "8px 10px",
                      }}
                    />
                    <Stars
                      value={revForm.rating}
                      onRate={(n) => setRevForm((p) => ({ ...p, rating: n }))}
                      size={20}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 7 }}>
                    <textarea
                      placeholder="리뷰를 입력하세요"
                      value={revForm.text}
                      onChange={(e) =>
                        setRevForm((p) => ({ ...p, text: e.target.value }))
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && e.ctrlKey && addReview()
                      }
                      rows={3}
                      style={{
                        ...inp(),
                        flex: 1,
                        fontSize: 13,
                        padding: "8px 10px",
                        resize: "none",
                        lineHeight: 1.5,
                      }}
                    />
                    <button
                      onClick={addReview}
                      style={{
                        background: C.ink,
                        color: "#fff",
                        border: "none",
                        borderRadius: R,
                        padding: "0 14px",
                        fontWeight: 500,
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                        alignSelf: "flex-start",
                        height: 35,
                      }}
                    >
                      등록
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: C.card,
                borderRadius: R,
                padding: "60px 20px",
                textAlign: "center",
                color: C.gray,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>👈</div>
              <div style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.7 }}>
                맛집을 선택하면
                <br />
                상세 정보를 볼 수 있어요
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 모달 ═══ */}
      {modal === "manageCats" && (
        <ManageCatsModal
          cats={cats}
          setCats={setCats}
          onClose={() => setModal(null)}
        />
      )}

      {(modal === "addRest" || modal === "editRest") && (
        <Modal
          title={modal === "addRest" ? "🏪 맛집 추가" : "✏️ 맛집 수정"}
          onClose={() => {
            setModal(null);
            setMd(null);
          }}
        >
          <div style={{ marginBottom: 13 }}>
            <div style={fieldLbl}>맛집 이름 *</div>
            <input
              style={inp()}
              placeholder="예: 황금 삼겹살"
              value={rForm.name}
              onChange={(e) =>
                setRForm((p) => ({ ...p, name: e.target.value }))
              }
            />
          </div>
          <div style={{ marginBottom: 13 }}>
            <div style={fieldLbl}>카테고리</div>
            <select
              value={rForm.cat}
              onChange={(e) => {
                const c = catOf(e.target.value);
                setRForm((p) => ({
                  ...p,
                  cat: e.target.value,
                  sub: c?.sub[0] || "",
                }));
              }}
              style={inp()}
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 13 }}>
            <div style={fieldLbl}>하위 카테고리</div>
            <select
              value={rForm.sub}
              onChange={(e) => setRForm((p) => ({ ...p, sub: e.target.value }))}
              style={inp()}
            >
              <option value="">선택 안함</option>
              {(catOf(rForm.cat)?.sub || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={fieldLbl}>네이버 지도 링크</div>
            <input
              style={inp()}
              placeholder="https://naver.me/..."
              value={rForm.mapUrl}
              onChange={(e) =>
                setRForm((p) => ({ ...p, mapUrl: e.target.value }))
              }
            />
            <div
              style={{
                fontSize: 11.5,
                color: C.muted,
                marginTop: 5,
                fontWeight: 400,
              }}
            >
              네이버 지도 앱 → 가게 검색 → 공유 → 링크 복사
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={saveRest}
              style={{
                flex: 1,
                padding: "11px 0",
                border: "none",
                borderRadius: R,
                fontWeight: 600,
                fontSize: 13.5,
                cursor: "pointer",
                background: C.ink,
                color: "#fff",
                fontFamily: "inherit",
              }}
            >
              {modal === "addRest" ? "추가하기" : "저장하기"}
            </button>
            <button
              onClick={() => {
                setModal(null);
                setMd(null);
              }}
              style={{
                flex: 1,
                padding: "11px 0",
                border: "none",
                borderRadius: R,
                fontWeight: 400,
                fontSize: 13.5,
                cursor: "pointer",
                background: C.bg,
                color: C.muted,
                fontFamily: "inherit",
              }}
            >
              취소
            </button>
          </div>
        </Modal>
      )}

      {modal === "delRest" && md && (
        <Modal
          title="맛집 삭제"
          onClose={() => {
            setModal(null);
            setMd(null);
          }}
          width={360}
        >
          <p
            style={{
              fontSize: 14,
              color: C.ink,
              lineHeight: 1.7,
              marginBottom: 22,
              fontWeight: 400,
            }}
          >
            <strong style={{ color: C.ink, fontWeight: 600 }}>{md.name}</strong>
            을(를) 삭제할까요?
            <br />
            <span style={{ color: C.muted, fontSize: 13 }}>
              후기와 별점도 함께 삭제돼요.
            </span>
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => delRest(md.id)}
              style={{
                flex: 1,
                padding: "11px 0",
                border: "none",
                borderRadius: R,
                fontWeight: 600,
                fontSize: 13.5,
                cursor: "pointer",
                background: "#ff4040",
                color: "#fff",
                fontFamily: "inherit",
              }}
            >
              삭제하기
            </button>
            <button
              onClick={() => {
                setModal(null);
                setMd(null);
              }}
              style={{
                flex: 1,
                padding: "11px 0",
                border: "none",
                borderRadius: R,
                fontWeight: 400,
                fontSize: 13.5,
                cursor: "pointer",
                background: C.bg,
                color: C.muted,
                fontFamily: "inherit",
              }}
            >
              취소
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
