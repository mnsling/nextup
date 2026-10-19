import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Plus,
  Play,
  Search,
  Users,
  X,
} from "lucide-react";

export function MobileMenu({
  menu,
  setMenu,
  go,
  requireAuth,
  setModal,
}) {
  const [mounted, setMounted] = useState(menu);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer;
    let frame;
    let secondFrame;

    if (menu) {
      setMounted(true);
      frame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      timer = setTimeout(() => setMounted(false), 380);
    }

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(secondFrame);
    };
  }, [menu]);

  useEffect(() => {
    if (!mounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") setMenu(false);
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, setMenu]);

  function navigate(key) {
    setMenu(false);
    go(key);
  }

  function openCreateModal(modalName) {
    setMenu(false);
    if (requireAuth()) setModal(modalName);
  }

  if (!mounted) return null;

  const links = [
    { key: "discover", label: "Discover", Icon: Search },
    { key: "clubs", label: "Clubs", Icon: Users },
    { key: "my-games", label: "My games", Icon: CalendarDays },
    { key: "profile", label: "Profile", Icon: CircleUserRound },
  ];

  return (
    <div
      className={`mobile-overlay ${visible ? "mobile-overlay-visible" : ""}`}
      onClick={() => setMenu(false)}
      aria-hidden={!visible}
    >
      <div
        className={`mobile-panel ${visible ? "mobile-panel-visible" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mobile-menu-header">
          <strong>
            NEXTUP<span className="brand-dot">.</span>
          </strong>

          <button
            className="mobile-menu-close"
            type="button"
            onClick={() => setMenu(false)}
            aria-label="Close menu"
            tabIndex={visible ? 0 : -1}
          >
            <X size={21} />
          </button>
        </div>

        <p className="mobile-menu-section-label">PLAY</p>

        <nav className="mobile-menu-links">
          {links.map(({ key, label, Icon }, index) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(key)}
              tabIndex={visible ? 0 : -1}
              style={{ "--menu-item-index": index }}
            >
              <span className="mobile-menu-link-label">
                <Icon size={19} aria-hidden="true" />
                {label}
              </span>
              <ChevronRight size={19} />
            </button>
          ))}
        </nav>

        <p className="mobile-menu-section-label mobile-menu-organize-label">
          ORGANIZE
        </p>

        <nav className="mobile-menu-links mobile-menu-organize">
          <button
            type="button"
            onClick={() => openCreateModal("createSession")}
            tabIndex={visible ? 0 : -1}
            style={{ "--menu-item-index": 4 }}
          >
            <span className="mobile-menu-link-label">
              <Play size={19} aria-hidden="true" />
              Host a session
            </span>
            <ChevronRight size={19} />
          </button>

          <button
            type="button"
            onClick={() => openCreateModal("createClub")}
            tabIndex={visible ? 0 : -1}
            style={{ "--menu-item-index": 5 }}
          >
            <span className="mobile-menu-link-label">
              <Plus size={19} aria-hidden="true" />
              Create a club
            </span>
            <ChevronRight size={19} />
          </button>
        </nav>

        <div className="mobile-menu-footer flex justify-between items-center">
          <span className="mobile-menu-footer-caption">
            FIND YOUR NEXT GAME.
          </span>
          <span className="brand-icon" aria-hidden="true" />
        </div>
      </div>

      <style>{`
        .mobile-menu-section-label {
          margin: 28px 0 8px;
          color: #8fa184;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .mobile-menu-link-label {
          display: inline-flex;
          align-items: center;
          gap: 14px;
        }

        .mobile-menu-link-label > svg {
          flex-shrink: 0;
          color: #a6b49d;
        }

        .mobile-menu-organize-label {
          margin-top: 30px;
        }

        .mobile-menu-organize > button {
          padding-top: 17px;
          padding-bottom: 17px;
          font-size: 17px;
        }

        @media (max-height: 760px) {
          .mobile-menu-section-label {
            margin-top: 18px;
          }

          .mobile-menu-links > button {
            padding-top: 14px;
            padding-bottom: 14px;
          }

          .mobile-menu-footer {
            padding-top: 24px;
          }
        }
      `}</style>
    </div>
  );
}
