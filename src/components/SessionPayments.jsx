import { useEffect, useState } from "react";
import {
  X,
  Upload,
  Check,
  CreditCard,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { SessionQrUpload } from "./SessionQrUpload";

async function uploadImage(bucket, userId, file) {
  if (
    !file?.size ||
    !["image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    )
  ) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be under 5 MB.");
  }

  const path = `${userId}/${crypto.randomUUID()}.${
    file.type.split("/")[1]
  }`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file);

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

  const qr =
    game.gcash_qr_path &&
    supabase.storage
      .from("session-qr")
      .getPublicUrl(game.gcash_qr_path).data.publicUrl;

  async function submit(event) {
    event.preventDefault();

    if (busy) return;

    const form = new FormData(event.currentTarget);

    setBusy(true);
    setError("");

    try {
      const path = await uploadImage(
        "session-receipts",
        auth.id,
        form.get("receipt"),
      );

      const { error } = await supabase.rpc(
        "submit_session_payment",
        {
          p_session_id: game.id,
          p_reference: String(
            form.get("reference"),
          ).trim(),
          p_receipt_path: path,
        },
      );

      if (error) throw error;

      flash(
        "Receipt submitted. Your slot awaits host approval.",
      );

      onClose();
    } catch (e) {
      setError(e.message);
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

        <span className="eyebrow">
          CONFIRM YOUR PLACE
        </span>

        <h2>Pay the session host</h2>

        <p className="muted">
          {game.title} · ₱
          {Number(game.fee).toLocaleString("en-PH")}
        </p>

        {qr ? (
          <>
            <div className="my-4 rounded-2xl border border-[#dce3d5] bg-white p-4">
              <img
                src={qr}
                alt="Host GCash payment QR"
                className="mx-auto h-56 w-56 object-contain"
              />
            </div>

            <p className="fine">
              Check the recipient in GCash before sending.
              Upload your receipt after payment. Your slot
              becomes confirmed after host approval.
              Submitting a receipt does not reserve a slot.
            </p>

            <form
              className="form"
              onSubmit={submit}
            >
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

                {busy
                  ? "Submitting…"
                  : "Submit for verification"}
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
        const { data, error } = await supabase
          .from("session_payments")
          .select("*")
          .eq("session_id", game.id)
          .order("created_at");

        if (error) throw error;

        let labels = {};

        const ids = [
          ...new Set(
            (data || []).map((payment) => payment.user_id),
          ),
        ];

        if (host && ids.length) {
          const result = await supabase
            .from("profiles")
            .select("id,full_name")
            .in("id", ids);

          labels = Object.fromEntries(
            (result.data || []).map((profile) => [
              profile.id,
              profile.full_name,
            ]),
          );
        }

        if (alive && current === request) {
          setPayments(data || []);
          setNames(labels);
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
      setError(e.message);
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
      const { error } = await supabase.rpc(
        "review_session_payment",
        {
          p_id: payment.id,
          p_approve: approve,
          p_note: note,
        },
      );

      if (error) throw error;

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
              alt="Submitted GCash receipt"
              className="mt-4 max-h-[70vh] w-full object-contain"
            />
          </section>
        </div>
      )}

      <span className="eyebrow">
        GCASH PAYMENTS
      </span>

      <h2>
        {host ? "Verify player payments" : "Your payment"}
      </h2>

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
        <p
          role="alert"
          className="mt-3 text-sm text-red-700"
        >
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
          Submit a receipt using Join this session. The
          host verifies your payment before adding you
          to the lineup.
        </p>
      )}

      {host && (
        <div className="mt-4 space-y-3">
          {payments.map((payment) => (
            <article
              key={payment.id}
              className="rounded-xl border border-[#dce3d5] p-4"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <strong>
                  {names[payment.user_id] || "Player"}
                </strong>

                <span className="rounded-full bg-[#edf4df] px-3 py-1 text-xs font-bold capitalize text-[#24412b]">
                  {payment.status}
                </span>
              </div>

              <p className="mt-2 text-sm text-[#687167]">
                ₱{payment.amount} · Ref:{" "}
                {payment.reference}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="outline"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const { data, error } =
                        await supabase.storage
                          .from("session-receipts")
                          .createSignedUrl(
                            payment.receipt_path,
                            300,
                          );

                      if (error) throw error;

                      setReceipt(data.signedUrl);
                    })
                  }
                >
                  <CreditCard size={16} />
                  View receipt
                </button>

                {payment.status === "pending" && (
                  <>
                    <button
                      type="button"
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        review(payment, true)
                      }
                    >
                      <Check size={16} />
                      Approve slot
                    </button>

                    <button
                      type="button"
                      className="outline"
                      disabled={busy}
                      onClick={() =>
                        review(payment, false)
                      }
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>

              {payment.note && (
                <p className="mt-2 text-sm text-[#687167]">
                  {payment.note}
                </p>
              )}
            </article>
          ))}

          {!loading && !payments.length && (
            <p className="muted">
              No payment submissions yet.
            </p>
          )}
        </div>
      )}
    </section>
  );
}