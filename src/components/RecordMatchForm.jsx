import { useState } from "react";
import { Save } from "lucide-react";
import { BrandSelect } from "./BrandSelect";

export function RecordMatchForm({
  queue,
  courts,
  onRecord,
  busy,
}) {
  const [message, setMessage] = useState("");
  const players = queue.filter(
    (player) => player.user_id
  );

  function submit(event) {
    event.preventDefault();

    const element = event.currentTarget;
    const form = new FormData(element);
    const ids = ["a1", "a2", "b1", "b2"].map(
      (key) => String(form.get(key))
    );

    if (new Set(ids).size !== 4) {
      setMessage("Choose four different players.");
      return;
    }

    setMessage("");

    onRecord({
      court_number: Number(form.get("court")),
      team_a: ids.slice(0, 2),
      team_b: ids.slice(2),
      score_a: Number(form.get("score_a")),
      score_b: Number(form.get("score_b")),
    }).then((saved) => {
      if (saved) element.reset();
    });
  }

  return (
    <section className="panel mt record-match">
      <span className="eyebrow">HOST TOOLS</span>
      <h2>Record a match</h2>
      <p className="muted">
        Save a finished game to update each player's
        match history and community rank.
      </p>

      {players.length < 4 ? (
        <p className="profile-notice">
          Four players must join this session before
          you record a doubles match.
        </p>
      ) : (
        <form className="form" onSubmit={submit}>
          <div className="record-teams">
            {[
              ["Team A", "a1", "a2"],
              ["Team B", "b1", "b2"],
            ].map(([label, first, second]) => (
              <fieldset key={label}>
                <legend>{label}</legend>

                <BrandSelect
                  name={first}
                  label={`${label} player 1`}
                  required
                  defaultValue=""
                >
                  <option value="">Player 1</option>
                  {players.map((player) => (
                    <option
                      key={player.user_id}
                      value={player.user_id}
                    >
                      {player.name || "Player"}
                    </option>
                  ))}
                </BrandSelect>

                <BrandSelect
                  name={second}
                  label={`${label} player 2`}
                  required
                  defaultValue=""
                >
                  <option value="">Player 2</option>
                  {players.map((player) => (
                    <option
                      key={player.user_id}
                      value={player.user_id}
                    >
                      {player.name || "Player"}
                    </option>
                  ))}
                </BrandSelect>
              </fieldset>
            ))}
          </div>

          <div className="form-row">
            <label>
              Court
              <BrandSelect name="court" label="Court">
                {Array.from(
                  { length: courts },
                  (_, index) => (
                    <option
                      key={index}
                      value={index + 1}
                    >
                      Court {index + 1}
                    </option>
                  )
                )}
              </BrandSelect>
            </label>

            <label>
              Team A score
              <input
                type="number"
                name="score_a"
                min={0}
                max={99}
                required
              />
            </label>

            <label>
              Team B score
              <input
                type="number"
                name="score_b"
                min={0}
                max={99}
                required
              />
            </label>
          </div>

          {message && (
            <p className="profile-notice">{message}</p>
          )}

          <button className="primary" disabled={busy}>
            <Save size={17} />
            {busy ? "Saving…" : "Save result"}
          </button>
        </form>
      )}
    </section>
  );
}