import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Check,
  LoaderCircle,
  QrCode,
  Upload,
  X,
} from "lucide-react";

import { supabase } from "../lib/supabase";

export function SessionQrUpload({
  game,
  auth,
  onUpdated,
  flash,
}) {
  const input = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const savedQr = game.gcash_qr_path
    ? supabase.storage
        .from("session-qr")
        .getPublicUrl(game.gcash_qr_path).data.publicUrl
    : "";

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(file);

    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    setFile(null);
    setError("");
  }, [game.id]);

  function choose(next) {
    if (busy || !next) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        next.type,
      )
    ) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (!next.size || next.size > 5 * 1024 * 1024) {
      setError("Choose an image under 5 MB.");
      return;
    }

    setError("");
    setFile(next);
  }

  async function save(event) {
    event.preventDefault();

    if (!file || busy) return;

    setBusy(true);
    setError("");

    try {
      const path = `${auth.id}/${crypto.randomUUID()}.${
        file.type.split("/")[1]
      }`;

      const upload = await supabase.storage
        .from("session-qr")
        .upload(path, file);

      if (upload.error) throw upload.error;

      const result = await supabase.rpc(
        "set_session_qr",
        {
          p_session_id: game.id,
          p_path: path,
        },
      );

      if (result.error) throw result.error;

      await onUpdated(result.data);

      setFile(null);

      flash("Session payment QR saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="mt-5 overflow-hidden rounded-2xl border border-[#dce3d5] bg-[#f8faf3]"
    >
      <div className="flex items-center gap-3 border-b border-[#dce3d5] px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#171e19] text-[#dcfa53]">
          <QrCode size={21} />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#171e19]">
            Your GCash QR
          </h3>

          <p className="mt-1 text-xs text-[#52634c]">
            Players scan this to pay your session fee.
          </p>
        </div>

        {savedQr && (
          <span className="flex items-center gap-1 rounded-full bg-[#e6efce] px-2 py-1 text-xs font-semibold text-[#24412b]">
            <Check size={13} />
            Saved
          </span>
        )}
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-2xl border border-[#dce3d5] bg-white p-3">
          {preview || savedQr ? (
            <img
              src={preview || savedQr}
              alt={
                file
                  ? "Selected GCash QR preview"
                  : "Saved GCash QR"
              }
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="text-center text-[#687167]">
              <QrCode
                size={48}
                className="mx-auto mb-2"
              />

              <span className="text-xs">
                No QR added yet
              </span>
            </div>
          )}

          {file && (
            <span className="absolute -bottom-2 rounded-full bg-[#dcfa53] px-3 py-1 text-[10px] font-bold text-[#171e19]">
              UNSAVED PREVIEW
            </span>
          )}
        </div>

        <div className="w-full min-w-0">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            tabIndex={-1}
            disabled={busy}
            aria-label="Select GCash QR image"
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();

              if (!busy) {
                setDragging(true);
              }
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);

              choose(event.dataTransfer.files?.[0]);
            }}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa747] disabled:cursor-wait disabled:opacity-50 ${
              dragging
                ? "border-[#8fa747] bg-[#eff6d9]"
                : "border-[#cbd6bd] bg-white hover:border-[#8fa747] hover:bg-[#eff6d9]"
            }`}
          >
            <Upload
              size={22}
              className="text-[#52634c]"
            />

            <span className="text-sm font-bold text-[#171e19]">
              {savedQr || file
                ? "Choose a different QR"
                : "Upload QR image"}
            </span>

            <span className="text-xs text-[#687167]">
              Click to browse or drop your image here
            </span>

            <span className="text-[11px] text-[#687167]">
              JPG, PNG, WebP · Up to 5 MB
            </span>
          </button>

          {file && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[#52634c]">
              <span className="min-w-0 flex-1 truncate">
                {file.name}
              </span>

              <button
                type="button"
                disabled={busy}
                onClick={() => setFile(null)}
                aria-label="Discard selected QR"
                className="rounded-md p-1 hover:bg-[#e6efce] focus-visible:ring-2 focus-visible:ring-[#8fa747]"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <p className="mt-3 text-xs leading-relaxed text-[#52634c]">
            Use a clear, uncropped QR. Your changes
            appear to players after you save.
          </p>

          <button
            type="submit"
            disabled={!file || busy}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#171e19] px-5 py-2.5 text-sm font-bold text-[#dcfa53] transition hover:bg-[#24412b] focus-visible:ring-2 focus-visible:ring-[#8fa747] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            ) : (
              <Check size={17} />
            )}

            {busy ? "Saving QR…" : "Save QR image"}
          </button>

          {error && (
            <p
              role="alert"
              className="mt-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}