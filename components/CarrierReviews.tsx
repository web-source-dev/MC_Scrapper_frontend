"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { draftCarrierReview, fetchCarrierReviews, saveCarrierReview } from "@/lib/api";
import { REPORT_WORDS, type Carrier, type DispatcherReview } from "@/lib/types";

type Props = {
  carrier: Carrier;
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CarrierReviews({ carrier }: Props) {
  const [reviews, setReviews] = useState<DispatcherReview[]>([]);
  const [words, setWords] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [writing, setWriting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identity = useMemo(
    () => ({ mc: carrier.mcNumber, dot: carrier.dotNumber }),
    [carrier.mcNumber, carrier.dotNumber],
  );
  const who = carrier.mcDisplay || carrier.legalName || "this MC";

  useEffect(() => {
    let cancelled = false;
    fetchCarrierReviews(identity)
      .then((items) => {
        if (!cancelled) setReviews(items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load reports");
      });
    return () => {
      cancelled = true;
    };
  }, [identity]);

  useEffect(() => {
    if (!words.length) {
      setWriting(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setWriting(true);
      setError(null);
      draftCarrierReview(carrier, words, controller.signal)
        .then((text) => {
          if (!controller.signal.aborted) setNote(text);
        })
        .catch((err) => {
          if (controller.signal.aborted || err?.name === "AbortError") return;
          if (!controller.signal.aborted) {
            setError(err instanceof Error ? err.message : "Unable to draft the report");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setWriting(false);
        });
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [carrier, words.join("|")]);

  function toggleWord(word: string) {
    setWords((current) => (current[0] === word ? [] : [word]));
  }

  async function onPublish(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!note.trim() || writing || saving) return;
    const ok = window.confirm(`Publish this report on ${who}? It cannot be removed.`);
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      const review = await saveCarrierReview({
        mcNumber: carrier.mcNumber,
        mcDisplay: carrier.mcDisplay,
        dotNumber: carrier.dotNumber,
        legalName: carrier.legalName,
        tags: words,
        note: note.trim(),
      });
      setReviews((current) => [review, ...current]);
      setWords([]);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-group profile-span review-panel">
      <div className="chips review-words">
        {REPORT_WORDS.map((word) => (
          <button
            key={word}
            type="button"
            className={`chip button-chip${words.includes(word) ? " is-on" : ""}`}
            onClick={() => toggleWord(word)}
          >
            {word}
          </button>
        ))}
      </div>
      <textarea
        className={writing ? "is-writing" : undefined}
        value={writing ? "Writing draft…" : note}
        onChange={(event) => {
          if (writing) return;
          setNote(event.target.value);
        }}
        maxLength={2000}
        rows={3}
        readOnly={writing}
        placeholder="What happened when you covered this MC? Write it in your own words, or click tags to start a draft."
      />
      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="primary review-post"
        onClick={onPublish}
        disabled={saving || writing || !note.trim()}
      >
        {saving ? "Publishing…" : "Publish report"}
      </button>
      {reviews.length ? (
        <ul className="review-list">
          {reviews.map((item) => (
            <li key={item.id}>
              <p className="review-meta">Published {formatWhen(item.createdAt)}</p>
              <p>{item.note}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">No reports on this MC yet.</p>
      )}
    </section>
  );
}
