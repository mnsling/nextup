import { useState } from "react";
import { Pencil, Save } from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  getSessionStatus,
  useSessionClock,
} from "../hooks/useSessionClock";
import { BrandDateTimePicker } from "./BrandDatePicker";
import { BrandSelect } from "./BrandSelect";

const localTime = (value) => {
  const date = new Date(value);

  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);
};

export function HostGameTools({
  game,
  onUpdated,
  flash,
  demo,
}) {
  const now = useSessionClock();
  const status = getSessionStatus(game, now);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();
    if (saving) return;

    const form = new FormData(event.currentTarget);
    const details = Object.fromEntries(form);

    setSaving(true);
    setError("");

    try {
      if (demo || !supabase) {
        throw new Error("Connect Supabase to edit games.");
      }

      const start = new Date(details.starts_at);
      const end = new Date(details.ends_at);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        throw new Error("Enter valid start and end times.");
      }

      if (end <= start) {
        throw new Error("End time must be after start time.");
      }

      details.starts_at = start.toISOString();
      details.ends_at = end.toISOString();

      ["capacity", "courts", "fee"].forEach((key) => {
        details[key] = Number(details[key]);
      });

      const { data, error: saveError } = await supabase.rpc(
        "edit_host_session",
        {
          p_session_id: game.id,
          p_details: details,
        },
      );

      if (saveError) throw saveError;

      await onUpdated(data);
      setEditing(false);
      flash("Game details saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel mt">
      <span className="eyebrow">HOST CONTROLS</span>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2>Manage game</h2>

        <button
          type="button"
          className="outline"
          disabled={saving}
          onClick={() => {
            setEditing(!editing);
            setError("");
          }}
        >
          <Pencil size={17} />
          {editing ? "Cancel editing" : "Edit game"}
        </button>
      </div>

      {editing && (
        <form className="form mt-4" onSubmit={save}>
          <label>
            Game title
            <input
              name="title"
              defaultValue={game.title}
              required
              minLength={3}
              maxLength={120}
            />
          </label>

          <label>
            Location
            <input
              name="location"
              defaultValue={game.location}
              required
            />
          </label>

          <label>
            Google Maps link
            <input
              name="maps_url"
              type="url"
              defaultValue={game.maps_url || ""}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Starts
              <BrandDateTimePicker
                name="starts_at"
                defaultValue={localTime(game.starts_at)}
                required
              />
            </label>

            <label>
              Ends
              <BrandDateTimePicker
                name="ends_at"
                defaultValue={localTime(game.ends_at)}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Player capacity
              <input
                name="capacity"
                type="number"
                min={2}
                max={256}
                defaultValue={game.capacity}
                required
              />
            </label>

            <label>
              Courts
              <input
                name="courts"
                type="number"
                min={1}
                max={32}
                defaultValue={game.courts}
                required
              />
            </label>
          </div>

          <label>
            Fee per player (₱)
            <input
              name="fee"
              type="number"
              min={0}
              step="0.01"
              defaultValue={game.fee || 0}
              required
            />
          </label>

          <label>
            Playing level
            <BrandSelect
              name="skill_level"
              defaultValue={game.skill_level}
            >
              {[
                ...new Set([
                  game.skill_level,
                  "All levels",
                  "Recreational",
                  "Beginner",
                  "Intermediate",
                  "Advanced",
                ]),
              ]
                .filter(Boolean)
                .map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
            </BrandSelect>
          </label>

          <div className="rounded-xl border border-[#d4dfcc] bg-[#f4f7ed] p-4">
            <span className="text-xs font-semibold text-[#596653]">
              Automatic session status
            </span>

            <p
              className="mt-1 font-bold text-[#24412b]"
              role="status"
            >
              {status === "open"
                ? "Registration open"
                : status === "live"
                  ? "Live"
                  : "Ended"}
            </p>

            <p className="mt-1 text-xs text-[#596653]">
              Status follows the saved start and end times.
            </p>
          </div>

          <button
            type="submit"
            className="primary"
            disabled={saving}
          >
            <Save size={17} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}