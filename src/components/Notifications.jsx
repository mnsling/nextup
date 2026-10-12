
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Bell,
  ArrowUpRight,
  CheckCheck,
  CreditCard,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export function Notifications({ auth, onOpenSession }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  const root = useRef(null);

  useEffect(() => {
    let alive = true;
    let request = 0;

    setItems([]);
    setUnread(0);
    setLoading(true);
    setError("");

    if (!supabase || !auth?.id) {
      setLoading(false);
      return;
    }

    async function load() {
      const current = ++request;

      try {
        const [list, count] = await Promise.all([
          supabase
            .from("notifications")
            .select("*")
            .eq("user_id", auth.id)
            .order("created_at", {
              ascending: false,
            })
            .limit(50),

          supabase
            .from("notifications")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("user_id", auth.id)
            .is("read_at", null),
        ]);

        if (list.error || count.error) {
          throw list.error || count.error;
        }

        if (alive && current === request) {
          setItems(list.data || []);
          setUnread(count.count || 0);
          setError("");
        }
      } catch (e) {
        if (alive && current === request) {
          setError(e.message);
        }
      } finally {
        if (alive && current === request) {
          setLoading(false);
        }
      }
    }

    load();

    const channel = supabase
      .channel(`notifications-${auth.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${auth.id}`,
        },
        load,
      )
      .subscribe();

    const timer = setInterval(load, 30000);

    window.addEventListener("focus", load);

    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
      supabase.removeChannel(channel);
    };
  }, [auth?.id, version]);

  useEffect(() => {
    if (!open) return;

    function outside(event) {
      if (!root.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function escape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        root.current?.querySelector("button")?.focus();
      }
    }

    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function read(item) {
    if (busy) return;

    setBusy(true);

    try {
      const result = await supabase.rpc(
        "read_notification",
        {
          p_id: item?.id || null,
        },
      );

      if (result.error) throw result.error;

      setVersion((value) => value + 1);

      if (item) {
        await onOpenSession(item.session_id);
        setOpen(false);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!auth?.id || !supabase) {
    return null;
  }

  return (
    <div ref={root} className="notification-root">
      <button
        type="button"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`notification-trigger ${
          open ? "notification-trigger-active" : ""
        }`}
      >
        <Bell size={19} />

        {unread > 0 && (
          <span className="notification-badge">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Notifications"
          className="notification-panel"
        >
          <div className="notification-heading">
            <h3>Notifications</h3>

            <button
              type="button"
              onClick={() => read(null)}
              disabled={busy || !unread}
              className="notification-mark-read"
            >
              <CheckCheck size={15} />
              Mark all read
            </button>
          </div>

          {error && (
            <p role="alert" className="notification-error">
              {error}
            </p>
          )}

          <div className="notification-list">
            {loading && (
              <p role="status" className="notification-loading">
                Loading notifications…
              </p>
            )}

            {!loading && !error && !items.length && (
              <div className="notification-empty">
                <Bell size={25} />

                <p className="notification-empty-title">
                  You're all caught up
                </p>

                <p className="notification-empty-description">
                  Club sessions and payment updates
                  will appear here.
                </p>
              </div>
            )}

            {items.map((item) => {
              const isPayment =
                item.kind === "payment_submitted";

              return (
                <button
                  type="button"
                  key={item.id}
                  disabled={busy}
                  onClick={() => read(item)}
                  className={`notification-item ${
                    item.read_at
                      ? "notification-item-read"
                      : "notification-item-unread"
                  }`}
                >
                  <span className="notification-item-icon">
                    {isPayment ? (
                      <CreditCard size={16} />
                    ) : (
                      <Bell size={16} />
                    )}
                  </span>

                  <span className="notification-item-content">
                    <span className="notification-item-title">
                      {isPayment
                        ? "Payment awaiting verification"
                        : item.club_name}
                    </span>

                    <span className="notification-item-message">
                      {isPayment
                        ? `${
                            item.actor_name || "A player"
                          } submitted a receipt for ${
                            item.session_title
                          }`
                        : `New session: ${item.session_title}`}
                    </span>

                    <span className="notification-item-date">
                      {new Date(
                        item.created_at,
                      ).toLocaleString("en-PH", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "Asia/Manila",
                      })}
                    </span>
                  </span>

                  {!item.read_at ? (
                    <span
                      aria-label="Unread"
                      className="notification-unread-dot"
                    />
                  ) : (
                    <ArrowUpRight
                      size={15}
                      className="notification-item-arrow"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
