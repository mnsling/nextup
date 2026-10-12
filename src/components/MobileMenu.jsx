
import { useEffect, useState } from "react";
import {
  ChevronRight,
  X,
} from "lucide-react";

export function MobileMenu({ menu, setMenu, go }) {
  const [mounted, setMounted] = useState(menu);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer;
    let frame;

    if (menu) {
      setMounted(true);

      frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);

      timer = setTimeout(() => {
        setMounted(false);
      }, 380);
    }

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [menu]);

  useEffect(() => {
    if (!mounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenu(false);
      }
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

  if (!mounted) return null;

  return (
    <div
      className={`mobile-overlay ${visible ? "mobile-overlay-visible" : ""
        }`}
      onClick={() => setMenu(false)}
      aria-hidden={!visible}
    >
      <div
        className={`mobile-panel ${visible ? "mobile-panel-visible" : ""
          }`}
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

        <nav className="mobile-menu-links">
          {[
            ["discover", "Discover"],
            ["clubs", "Clubs"],
            ["my-games", "My games"],
            ["profile", "Profile"],
          ].map(([key, label], index) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(key)}
              tabIndex={visible ? 0 : -1}
              style={{
                "--menu-item-index": index,
              }}
            >
              <span>{label}</span>
              <ChevronRight size={19} />
            </button>
          ))}
        </nav>

        <div className="mobile-menu-footer flex justify-between items-center">
          <span className="mobile-menu-footer-caption">
            FIND YOUR NEXT GAME.
          </span>
          <span className="brand-icon" />
        </div>
      </div>
    </div>
  );
}
