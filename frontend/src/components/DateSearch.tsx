import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { DIVISIONS, type Division } from "../constants";
import { isValidIsoDate } from "../utils";

interface Props {
  initialDate?: string;
  initialDivision?: Division | "";
  minDate?: string | null;
  maxDate?: string | null;
}

/** Search one exact day (YYYY-MM-DD, same format as the database), optionally for one division. */
export default function DateSearch({ initialDate = "", initialDivision = "", minDate, maxDate }: Props) {
  const navigate = useNavigate();
  const [text, setText] = useState(initialDate);
  const [division, setDivision] = useState<Division | "">(initialDivision);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(initialDate);
    setDivision(initialDivision);
    setError(null);
  }, [initialDate, initialDivision]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!isValidIsoDate(value)) {
      setError("Enter a real date as YYYY-MM-DD, for example 2026-10-12.");
      return;
    }
    if ((minDate && value < minDate) || (maxDate && value > maxDate)) {
      setError(`No data for that date. Data is available from ${minDate} to ${maxDate}.`);
      return;
    }
    setError(null);
    navigate(`/day/${value}${division ? `?division=${encodeURIComponent(division)}` : ""}`);
  }

  return (
    <form className="datesearch card" onSubmit={handleSubmit} noValidate>
      <label>
        Search a date (YYYY-MM-DD)
        <input
          type="text"
          inputMode="numeric"
          placeholder="2026-10-12"
          maxLength={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <label>
        or pick from calendar
        <input
          type="date"
          value={isValidIsoDate(text) ? text : ""}
          min={minDate ?? undefined}
          max={maxDate ?? undefined}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <label>
        Division
        <select value={division} onChange={(e) => setDivision(e.target.value as Division | "")}>
          <option value="">All divisions</option>
          {DIVISIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </label>
      <button className="btn btn-primary">Search day</button>
      {error && <p className="alert datesearch-error">{error}</p>}
    </form>
  );
}
