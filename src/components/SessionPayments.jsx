
import { useEffect, useState } from "react";
import {
  X,
  Upload,
  Check,
  Eye,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { SessionQrUpload } from "./SessionQrUpload";

async function uploadImage(bucket, userId, file) {
  if (
    !file?.size ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  ) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be under 5 MB.");
  }

  const extension = file.type.split("/")[1];
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type });

  if (error) throw error;

  return path;
}

export function SessionPaymentModal({
  game,
  auth,
  onClose,
  flash,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qrZoomOpen, setQrZoomOpen] = useState(false);

  useEffect(() => {
    if (!qrZoomOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") setQrZoomOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [qrZoomOpen]);

  const qr =
    game.gcash_qr_path &&
    supabase.storage
      .from("session-qr")
      .getPublicUrl(game.gcash_qr_path).data.publicUrl;

  async function submit(event) {
    event.preventDefault();

    if (busy) return;

    const form = new FormData(event.currentTarget);
    const file = form.get("receipt");
    const reference = String(form.get("reference") || "").trim();

    setBusy(true);
    setError("");

    try {
      // Use the actual authenticated account, not the session host's ID.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("Please sign in again before submitting payment.");
      }

      const path = await uploadImage(
        "session-receipts",
        user.id,
        file,
      );

      let { error: submitError } = await supabase.rpc(
        "submit_session_payment",
        {
          p_session_id: game.id,
          p_reference: reference,
          p_receipt_path: path,
        },
      );

      // If the removal record is stale, attempt the normal rejoin
      // flow and retry once. Database checks still apply.
      if (
        submitError &&
        /removed from this session|you were removed/i.test(
          submitError.message || "",
        )
      ) {
        const { error: rejoinError } = await supabase.rpc(
          "join_session",
          { p_session_id: game.id },
        );

        if (rejoinError) throw rejoinError;

        const retry = await supabase.rpc(
          "submit_session_payment",
          {
            p_session_id: game.id,
            p_reference: reference,
            p_receipt_path: path,
          },
        );

        submitError = retry.error;
      }

      if (submitError) throw submitError;

      flash("Receipt submitted. Your slot awaits host approval.");
      onClose();
    } catch (e) {
      setError(e.message || "Could not submit payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-back">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Session payment"
      >
        <button
          type="button"
          className="modal-close"
          disabled={busy}
          onClick={onClose}
          aria-label="Close payment"
        >
          <X size={20} />
        </button>

        <span className="eyebrow">CONFIRM YOUR PLACE</span>

        <h2>Pay the session host</h2>

        <p className="muted">
          {game.title} · ₱
          {Number(game.fee).toLocaleString("en-PH")}
        </p>

        {qr ? (
          <>
            <div className="my-4 rounded-2xl border border-[#dce3d5] bg-white p-4">
              <button
                type="button"
                className="mx-auto block cursor-zoom-in rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a8ca43]"
                onClick={() => setQrZoomOpen(true)}
                aria-label="Enlarge host GCash QR code"
              >
                <img
                  src={qr}
                  alt="Host GCash payment QR. Click to enlarge."
                  className="mx-auto h-56 w-56 object-contain"
                />
              </button>

              <p className="mt-2 text-center text-xs text-[#687167]">
                Tap or click the QR code to enlarge it.
              </p>
            </div>

            <p className="fine">
              Check the recipient in GCash before sending.
              Upload your receipt after payment. Your slot
              becomes confirmed after host approval.
              Submitting a receipt does not reserve a slot.
            </p>

            <form className="form" onSubmit={submit}>
              <label>
                GCash reference number
                <input
                  name="reference"
                  required
                  minLength={6}
                  maxLength={80}
                  disabled={busy}
                />
              </label>

              <label>
                Payment receipt
                <input
                  name="receipt"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  disabled={busy}
                />
              </label>

              <button
                className="primary full"
                disabled={busy}
              >
                <Upload size={17} />
                {busy ? "Submitting…" : "Submit for verification"}
              </button>
            </form>
          </>
        ) : (
          <p className="my-4 rounded-xl bg-[#edf4df] p-4 text-sm text-[#24412b]">
            The host has not added a GCash QR yet. Please
            wait before paying.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
      </section>

      {qrZoomOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setQrZoomOpen(false);
            }
          }}
        >
          <section
            className="relative w-full max-w-xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Enlarged host GCash payment QR code"
          >
            <button
              type="button"
              className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-xl border border-[#dce3d5] bg-white text-[#243126] transition hover:bg-[#f5f7ef]"
              onClick={() => setQrZoomOpen(false)}
              aria-label="Close enlarged QR code"
            >
              <X size={20} />
            </button>

            <p className="mb-4 pr-12 text-sm font-semibold text-[#243126]">
              Scan to pay the session host
            </p>

            <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-xl bg-white p-2">
              <img
                src={qr}
                alt="Enlarged host GCash payment QR code"
                className="max-h-[70vh] w-full max-w-[480px] object-contain"
              />
            </div>

            <p className="mt-3 text-center text-xs text-[#687167]">
              Check the recipient in GCash before sending.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

export function SessionPaymentPanel({
  game,
  auth,
  onUpdated,
  onApproved,
  flash,
}) {
  const host = auth?.id === game.host_id;

  const [payments, setPayments] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    let request = 0;

    async function load() {
      if (!supabase || !auth?.id) {
        if (alive) setLoading(false);
        return;
      }

      const current = ++request;

      try {
        const { data, error: paymentsError } = await supabase
          .from("session_payments")
          .select("*")
          .eq("session_id", game.id)
          .order("created_at");

        if (paymentsError) throw paymentsError;

        const paymentRows = data || [];
        const ids = [
          ...new Set(
            paymentRows
              .map((payment) => payment.user_id)
              .filter(Boolean),
          ),
        ];

        const labels = {};

        if (host && ids.length) {
          // The payer name must come from the profile whose ID matches
          // session_payments.user_id. Do not substitute the host's name
          // from a notification that may not identify the payer.
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);

          if (profilesError) {
            console.warn(
              "Could not load player profiles:",
              profilesError.message,
            );
          } else {
            for (const profile of profiles || []) {
              const name = profile.full_name?.trim();

              if (name) {
                labels[profile.id] = name;
              }
            }
          }
        }

        if (alive && current === request) {
          setPayments(paymentRows);
          setNames(labels);
          setError("");
        }
      } catch (e) {
        if (alive && current === request) {
          setError(e.message || "Could not load payments.");
        }
      } finally {
        if (alive && current === request) {
          setLoading(false);
        }
      }
    }

    load();

    const timer = setInterval(load, 5000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [game.id, auth?.id, host, version]);

  async function run(action) {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await action();
      setVersion((value) => value + 1);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function review(payment, approve) {
    const note = approve
      ? ""
      : window.prompt(
          "Reason for rejecting this receipt:",
          "Receipt could not be verified",
        );

    if (note === null) return;

    await run(async () => {
      const { error: reviewError } = await supabase.rpc(
        "review_session_payment",
        {
          p_id: payment.id,
          p_approve: approve,
          p_note: note,
        },
      );

      if (reviewError) throw reviewError;

      await onApproved?.();

      flash(
        approve
          ? "Payment approved. Player added to the lineup."
          : "Receipt rejected. Player can resubmit.",
      );
    });
  }

  const own = payments.find(
    (payment) => payment.user_id === auth?.id,
  );

  if (!auth?.id || Number(game.fee) <= 0) {
    return null;
  }

  return (
    <section className="panel mt">
      {receipt && (
        <div className="modal-back">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Payment receipt"
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close receipt"
              onClick={() => setReceipt(null)}
            >
              <X size={20} />
            </button>

            <h2>Payment receipt</h2>

            <img
              src={receipt}
              alt="Submitted payment receipt"
              className="mt-4 max-h-[70vh] w-full object-contain"
            />
          </section>
        </div>
      )}

      <span className="eyebrow">GCASH PAYMENTS</span>

      <h2>{host ? "Verify player payments" : "Your payment"}</h2>

      {host && (
        <SessionQrUpload
          game={game}
          auth={auth}
          onUpdated={onUpdated}
          flash={flash}
        />
      )}

      {loading && (
        <p role="status">Loading payments…</p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!host && own && (
        <div className="mt-4 rounded-xl bg-[#edf4df] p-4 text-sm text-[#24412b]">
          <strong>
            {own.status === "approved"
              ? "Paid · payment verified"
              : own.status === "pending"
                ? "Payment pending · awaiting host verification"
                : "Receipt rejected"}
          </strong>

          {own.note && (
            <p className="mt-2">{own.note}</p>
          )}

          <p className="mt-2">
            {own.status === "pending"
              ? "Your slot is not confirmed yet."
              : own.status === "rejected"
                ? "Use Join this session to submit a new receipt."
                : "Check Confirmed members for your current slot."}
          </p>
        </div>
      )}

      {!host && !own && !loading && (
        <p className="muted">
          Submit a receipt using Join this session. The host verifies
          your payment before adding you to the lineup.
        </p>
      )}

      {host && (
        <div className="mt-4 space-y-3">
          {payments.map((payment) => (
            <article
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce3d5] bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-semibold text-[#17231a]">
                  {names[payment.user_id] || "Name unavailable"}
                </strong>

                <p className="mt-1 text-sm text-[#687167]">
                  ₱{Number(payment.amount || 0).toLocaleString("en-PH")}
                  {" · Ref No: "}
                  {payment.reference || "—"}
                </p>

                {payment.note && (
                  <p className="mt-1 text-xs text-[#687167]">
                    {payment.note}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                    payment.status === "approved"
                      ? "bg-[#e8f5d5] text-[#31541f]"
                      : payment.status === "rejected"
                        ? "bg-[#fce8e6] text-[#9a3027]"
                        : "bg-[#edf4df] text-[#24412b]"
                  }`}
                >
                  {payment.status}
                </span>

                {payment.status === "pending" && (
                  <>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-lg bg-[#dcfa53] text-[#17231a] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busy}
                      onClick={() => review(payment, true)}
                      aria-label={`Approve payment from ${
                        names[payment.user_id] || "player"
                      }`}
                      title="Approve payment"
                    >
                      <Check size={18} />
                    </button>

                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-[#dce3d5] bg-white text-[#243126] transition hover:bg-[#f5f7ef] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busy}
                      onClick={() => review(payment, false)}
                      aria-label={`Reject payment from ${
                        names[payment.user_id] || "player"
                      }`}
                      title="Reject payment"
                    >
                      <X size={18} />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[#dce3d5] bg-white text-[#243126] transition hover:bg-[#f5f7ef] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const { data, error: receiptError } =
                        await supabase.storage
                          .from("session-receipts")
                          .createSignedUrl(payment.receipt_path, 300);

                      if (receiptError) throw receiptError;

                      setReceipt(data.signedUrl);
                    })
                  }
                  aria-label="View payment receipt"
                  title="View receipt"
                >
                  <Eye size={18} />
                </button>
              </div>
            </article>
          ))}

          {!loading && !payments.length && (
            <p className="muted">No payment submissions yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
