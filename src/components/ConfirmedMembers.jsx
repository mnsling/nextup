import { useState } from "react";
import { Minus } from "lucide-react";
import { supabase } from "../lib/supabase";

export function ConfirmedMembers({
  game,
  auth,
  queue = [],
  demo,
  joined,
  onRemoved,
  flash,
}) {
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  const isHost = Boolean(
    auth?.id && auth.id === game.host_id,
  );

  const players = demo
    ? joined
      ? [
          {
            id: "you",
            user_id: auth?.id,
            name: "You",
            status: "waiting",
          },
        ]
      : []
    : queue;

  async function removePlayer() {
    if (!isHost || !target || removing) return;

    setRemoving(true);
    setError("");

    try {
      if (demo || !supabase) {
        throw new Error("Connect Supabase to remove players.");
      }

      const { error: removalError } = await supabase.rpc(
        "remove_session_player",
        {
          p_session_id: game.id,
          p_user_id: target.user_id,
          p_reason: reason.trim(),
        },
      );

      if (removalError) throw removalError;

      await onRemoved?.(target.user_id);

      setTarget(null);
      setReason("");

      flash(
        target.user_id === game.host_id
          ? "You left the participant list. Host controls remain available."
          : "Player removed from this game.",
      );
    } catch (removalError) {
      setError(
        removalError.message ||
          "Removal failed. Please try again.",
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <section className="panel mt">
      <div className="flex items-center justify-between gap-3">
        <h2>Confirmed members</h2>

        <span className="rounded-full bg-[#edf4df] px-3 py-1 text-sm font-bold text-[#24412b]">
          {players.length} / {game.capacity}
        </span>
      </div>

      <p className="muted">
        Waiting means the player has not been assigned to a court.
      </p>

      <div className="mt-4 divide-y divide-slate-200">
        {players.map((player, index) => {
          const name =
            player.name ||
            player.profiles?.full_name ||
            "Player";

          return (
            <div
              key={player.user_id || player.id}
              className="flex flex-wrap items-starty gap-3 py-3"
            >
              <span className="queue-number shrink-0">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <strong className="block break-words text-sm text-slate-900">
                  {name}
                </strong>

                {player.user_id === game.host_id && (
                  <span className="text-xs font-medium text-slate-500">
                    Host
                  </span>
                )}
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-[#edf4df] px-3 py-1.5 text-xs font-semibold capitalize text-[#24412b]">
                  {player.status || "waiting"}
                </span>

                {isHost && (
                  <button
                    type="button"
                    disabled={removing || !player.user_id}
                    aria-label={`Remove ${name}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
                    onClick={() => {
                      setTarget(player);
                      setReason("");
                      setError("");
                    }}
                  >
                    <Minus size={14} aria-hidden="true" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {!players.length && (
          <div className="empty-queue">
            No confirmed members yet.
          </div>
        )}
      </div>

      {isHost && target && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <h3 className="font-bold text-slate-900">
            Remove{" "}
            {target.name ||
              target.profiles?.full_name ||
              "this player"}
            ?
          </h3>

          <p className="mt-1 text-sm text-slate-600">
            Their active match will end without a ranked result.
            Finished results remain saved.
            {target.user_id === game.host_id
              ? " Your host controls stay available. You are allowed to rejoin while registration is open."
              : " Removed players are blocked from rejoining."}
          </p>

          <label className="mt-3 block text-sm font-medium">
            Reason (optional)
            <textarea
              className="mt-2 w-full rounded-lg border border-red-200 bg-white p-3"
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              maxLength={300}
              disabled={removing}
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={removing}
              onClick={removePlayer}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {removing ? "Removing…" : "Confirm removal"}
            </button>

            <button
              type="button"
              disabled={removing}
              className="outline"
              onClick={() => {
                setTarget(null);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}