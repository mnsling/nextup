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

export function Notifications({
  auth,
  onOpenSession,
}) {
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

    document.addEventListener(
      "pointerdown",
      outside,
    );
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener(
        "pointerdown",
        outside,
      );
      document.removeEventListener(
        "keydown",
        escape,
      );
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
    <div
      ref={root}
      className="relative"
    >
      <button
        type="button"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() =>
          setOpen((value) => !value)
        }
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#dce3d5] bg-white text-[#171e19] transition hover:bg-[#eff6d9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa747]"
      >
        <Bell size={19} />

        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dcfa53] px-1 text-[10px] font-bold text-[#171e19]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Notifications"
          className="fixed left-3 right-3 top-20 z-50 overflow-hidden rounded-2xl border border-[#dce3d5] bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-96"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#e2e8db] p-4">
            <h3 className="font-bold text-[#171e19]">
              Notifications
            </h3>

            <button
              type="button"
              onClick={() => read(null)}
              disabled={busy || !unread}
              className="flex items-center gap-1 text-xs font-semibold text-[#52634c] disabled:opacity-40"
            >
              <CheckCheck size={15} />
              Mark all read
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="p-4 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <div className="max-h-96 overflow-y-auto overscroll-contain">
            {loading && (
              <p
                role="status"
                className="p-5 text-sm text-[#687167]"
              >
                Loading notifications…
              </p>
            )}

            {!loading &&
              !error &&
              !items.length && (
                <div className="p-8 text-center">
                  <Bell
                    size={25}
                    className="mx-auto mb-3 text-[#8a967f]"
                  />

                  <p className="text-sm font-bold text-[#171e19]">
                    You're all caught up
                  </p>

                  <p className="mt-2 text-xs text-[#687167]">
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
                  className={`flex w-full items-start gap-3 border-b border-[#e2e8db] p-4 text-left transition hover:bg-[#eff6d9] disabled:opacity-50 ${
                    item.read_at
                      ? "bg-white"
                      : "bg-[#f8faf3]"
                  }`}
                >
                  <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#171e19] text-[#dcfa53]">
                    {isPayment ? (
                      <CreditCard size={16} />
                    ) : (
                      <Bell size={16} />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-[#171e19]">
                      {isPayment
                        ? "Payment awaiting verification"
                        : item.club_name}
                    </span>

                    <span className="mt-1 block text-sm text-[#52634c]">
                      {isPayment
                        ? `${
                            item.actor_name || "A player"
                          } submitted a receipt for ${
                            item.session_title
                          }`
                        : `New session: ${item.session_title}`}
                    </span>

                    <span className="mt-2 block text-xs text-[#687167]">
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
                      className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#8fa747]"
                    />
                  ) : (
                    <ArrowUpRight
                      size={15}
                      className="mt-1 shrink-0 text-[#687167]"
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