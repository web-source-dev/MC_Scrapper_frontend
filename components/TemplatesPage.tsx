"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteEmailTemplate,
  fetchEmailStatus,
  saveEmailTemplate,
} from "@/lib/api";
import { applyEmailTemplate, openComposeEmail, openGmailPage } from "@/lib/email";
import type { EmailStatus, EmailTemplate } from "@/lib/types";

const EMPTY_TEMPLATE = { name: "", subject: "", body: "", isDefault: false };
const MOBILE_MQ = "(max-width: 900px)";

const PREVIEW_VARS: Record<string, string> = {
  company: "Apex Freight Lines",
  legalName: "Apex Freight Lines LLC",
  officer: "Mike",
  mc: "123456",
  dot: "987654",
  phone: "(312) 555-0142",
  email: "dispatch@apexfreight.example",
  city: "Chicago",
  state: "IL",
  zip: "60601",
  trucks: "24",
  safety: "Satisfactory",
  to: "dispatch@apexfreight.example",
};

type MobilePane = "list" | "edit";

export function TemplatesPage() {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(EMPTY_TEMPLATE);
  const [showPreview, setShowPreview] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");
  const [dirty, setDirty] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const lastField = useRef<"subject" | "body">("body");

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_MQ);
    const desktopPreview = window.matchMedia("(min-width: 1101px)");

    function sync() {
      const mobileNow = mobile.matches;
      setIsMobile(mobileNow);
      setShowPreview(desktopPreview.matches);
      if (!mobileNow) setMobilePane("list");
    }

    sync();
    mobile.addEventListener("change", sync);
    desktopPreview.addEventListener("change", sync);
    return () => {
      mobile.removeEventListener("change", sync);
      desktopPreview.removeEventListener("change", sync);
    };
  }, []);

  const selected = useMemo(
    () => status?.templates.find((item) => item.id === selectedId) || null,
    [status, selectedId],
  );
  const templates = status?.templates || [];
  const accountCount = status?.accountCount ?? status?.accounts?.length ?? 0;
  const isCreating = !selectedId;
  const editorMode = isCreating ? "create" : "edit";

  const previewSubject = applyEmailTemplate(draft.subject, PREVIEW_VARS);
  const previewBody = applyEmailTemplate(draft.body, PREVIEW_VARS);

  const statusLabel = busy === "save"
    ? "Saving…"
    : busy === "delete"
      ? "Deleting…"
      : busy === "dup"
        ? "Copying…"
        : dirty
          ? "Unsaved changes"
          : notice
            ? "Saved"
            : isCreating
              ? "New draft"
              : "Ready";

  function flash(message: string, isError = false) {
    if (isError) {
      setError(message);
      setNotice(null);
    } else {
      setNotice(message);
      setError(null);
    }
  }

  function patchDraft(patch: Partial<typeof EMPTY_TEMPLATE>) {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
  }

  function selectTemplate(template: EmailTemplate, openEditor = false) {
    setSelectedId(template.id);
    setDraft({
      name: template.name,
      subject: template.subject,
      body: template.body,
      isDefault: template.isDefault,
    });
    setDirty(false);
    if (openEditor || isMobile) setMobilePane("edit");
  }

  function startNewTemplate() {
    setSelectedId("");
    setDraft(EMPTY_TEMPLATE);
    setDirty(false);
    setMobilePane("edit");
  }

  function backToList() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setMobilePane("list");
    if (dirty) {
      const current = templates.find((item) => item.id === selectedId);
      if (current) {
        setDraft({
          name: current.name,
          subject: current.subject,
          body: current.body,
          isDefault: current.isDefault,
        });
      } else {
        setDraft(EMPTY_TEMPLATE);
        setSelectedId("");
      }
      setDirty(false);
    }
  }

  async function reload() {
    const next = await fetchEmailStatus();
    setStatus(next);
    return next;
  }

  useEffect(() => {
    reload()
      .then((next) => {
        const template = next.templates.find((item) => item.isDefault) || next.templates[0];
        if (template) {
          setSelectedId(template.id);
          setDraft({
            name: template.name,
            subject: template.subject,
            body: template.body,
            isDefault: template.isDefault,
          });
          setDirty(false);
        }
      })
      .catch((err) => flash(err instanceof Error ? err.message : "Unable to load templates", true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!notice && !error) return;
    const timer = window.setTimeout(() => {
      setNotice(null);
      setError(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [notice, error]);

  async function saveTemplate() {
    setBusy("save");
    try {
      const payload = await saveEmailTemplate({
        id: selectedId || undefined,
        ...draft,
      });
      const next = await reload();
      const template = next.templates.find((item) => item.id === payload.template.id);
      if (template) {
        setSelectedId(template.id);
        setDraft({
          name: template.name,
          subject: template.subject,
          body: template.body,
          isDefault: template.isDefault,
        });
      }
      setDirty(false);
      flash(selectedId ? "Template saved" : "Template created");
      if (isMobile) setMobilePane("list");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to save template", true);
    } finally {
      setBusy("");
    }
  }

  async function duplicateTemplate(template: EmailTemplate) {
    setBusy("dup");
    try {
      const payload = await saveEmailTemplate({
        name: `${template.name} copy`,
        subject: template.subject,
        body: template.body,
        isDefault: false,
      });
      const next = await reload();
      const created = next.templates.find((item) => item.id === payload.template.id);
      if (created) selectTemplate(created, true);
      flash("Template duplicated");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to duplicate template", true);
    } finally {
      setBusy("");
    }
  }

  async function removeTemplate(template: EmailTemplate) {
    if (!window.confirm(`Delete “${template.name}”?`)) return;
    setBusy("delete");
    try {
      await deleteEmailTemplate(template.id);
      const next = await reload();
      const fallback = next.templates.find((item) => item.isDefault) || next.templates[0];
      if (fallback) {
        setSelectedId(fallback.id);
        setDraft({
          name: fallback.name,
          subject: fallback.subject,
          body: fallback.body,
          isDefault: fallback.isDefault,
        });
      } else {
        setSelectedId("");
        setDraft(EMPTY_TEMPLATE);
      }
      setDirty(false);
      flash("Template deleted");
      if (isMobile) setMobilePane("list");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Unable to delete template", true);
    } finally {
      setBusy("");
    }
  }

  function insertToken(token: string) {
    if (lastField.current === "subject" && subjectRef.current) {
      const field = subjectRef.current;
      const start = field.selectionStart ?? draft.subject.length;
      const end = field.selectionEnd ?? start;
      const next = `${draft.subject.slice(0, start)}${token}${draft.subject.slice(end)}`;
      patchDraft({ subject: next });
      window.requestAnimationFrame(() => {
        field.focus();
        const cursor = start + token.length;
        field.setSelectionRange(cursor, cursor);
      });
      return;
    }
    const field = bodyRef.current;
    if (!field) {
      patchDraft({ body: `${draft.body}${token}` });
      return;
    }
    const start = field.selectionStart ?? draft.body.length;
    const end = field.selectionEnd ?? start;
    const next = `${draft.body.slice(0, start)}${token}${draft.body.slice(end)}`;
    patchDraft({ body: next });
    window.requestAnimationFrame(() => {
      field.focus();
      const cursor = start + token.length;
      field.setSelectionRange(cursor, cursor);
    });
  }

  if (loading) {
    return (
      <div className="mail-studio tpl-page">
        <div className="tpl-state tpl-state-loading" aria-busy="true">
          <span className="tpl-spinner" aria-hidden="true" />
          <strong>Loading templates…</strong>
          <p>Preparing your message library</p>
        </div>
      </div>
    );
  }

  const showList = !isMobile || mobilePane === "list";
  const showEditor = !isMobile || mobilePane === "edit";

  return (
    <div className={`mail-studio tpl-page ${isMobile ? `is-mobile pane-${mobilePane}` : "is-desktop"}`}>
      <header className="tpl-topbar">
        <div className="tpl-topbar-copy">
          {isMobile && mobilePane === "edit" ? (
            <button type="button" className="tpl-back" onClick={backToList}>
              ← Library
            </button>
          ) : (
            <p className="mail-eyebrow">Mail</p>
          )}
          <h2>{isMobile && mobilePane === "edit" ? (isCreating ? "New template" : "Edit template") : "Templates"}</h2>
        </div>
        <div className="tpl-status-row" aria-live="polite">
          <span className={`tpl-chip ${dirty ? "is-warn" : busy ? "is-busy" : notice ? "is-ok" : ""}`}>
            {statusLabel}
          </span>
          <span className="tpl-chip is-muted">{templates.length} templates</span>
          <span className={`tpl-chip ${accountCount ? "is-ok" : "is-warn"}`}>
            {accountCount ? `${accountCount} Gmail` : "No Gmail"}
          </span>
        </div>
      </header>

      {error ? (
        <p className="banner error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="banner">{notice}</p> : null}
      {!accountCount && showList ? (
        <p className="banner warn" role="status">
          Connect Gmail before sending.{" "}
          <button type="button" className="dat-text-link" onClick={() => openGmailPage()}>
            Open Gmail
          </button>
        </p>
      ) : null}

      <div className="mail-studio-body mail-studio-fill tpl-body">
        {showList ? (
          <aside className="mail-rail tpl-list" aria-label="Template library">
            <div className="mail-rail-head">
              <div>
                <h3>Library</h3>
                <p className="tpl-list-hint">Pick a template to edit</p>
              </div>
              <button type="button" className="primary tpl-new-btn" onClick={startNewTemplate}>
                New
              </button>
            </div>

            {templates.length ? (
              <div className="mail-rail-list tpl-list-scroll">
                {templates.map((item) => (
                  <div
                    key={item.id}
                    className={item.id === selectedId && !isMobile ? "mail-rail-item is-on" : "mail-rail-item"}
                  >
                    <button type="button" className="mail-rail-main" onClick={() => selectTemplate(item, true)}>
                      <strong>
                        {item.name}
                        {item.isDefault ? <span className="mail-badge">Default</span> : null}
                      </strong>
                      <span>{item.subject || "No subject"}</span>
                    </button>
                    <div className="tpl-list-actions">
                      <button
                        type="button"
                        className="mail-rail-copy"
                        title="Duplicate template"
                        disabled={Boolean(busy)}
                        onClick={() => void duplicateTemplate(item)}
                      >
                        Copy
                      </button>
                      {isMobile ? (
                        <button type="button" className="mail-rail-copy" onClick={() => selectTemplate(item, true)}>
                          Edit
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tpl-state tpl-state-empty">
                <strong>No templates yet</strong>
                <p>Create your first carrier message template to get started.</p>
                <button type="button" className="primary" onClick={startNewTemplate}>
                  Create template
                </button>
              </div>
            )}
          </aside>
        ) : null}

        {showEditor ? (
          <section className="mail-editor tpl-editor" aria-label="Template editor" data-mode={editorMode}>
            <div className="mail-editor-head">
              <div>
                <p className="mail-eyebrow">{isCreating ? "Creating" : "Editing"}</p>
                <h3>{isCreating ? "New template" : draft.name || "Untitled template"}</h3>
              </div>
              {!isMobile ? (
                <div className="mail-editor-toggles">
                  <button
                    type="button"
                    className={showPreview ? "mail-toggle is-on" : "mail-toggle"}
                    aria-pressed={showPreview}
                    onClick={() => setShowPreview((value) => !value)}
                  >
                    Preview
                  </button>
                </div>
              ) : null}
            </div>

            <div className={showPreview && !isMobile ? "mail-editor-grid has-preview" : "mail-editor-grid"}>
              <div className="mail-editor-form">
                <label className="mail-field">
                  <span>Name</span>
                  <input
                    value={draft.name}
                    placeholder="Capacity check"
                    onChange={(event) => patchDraft({ name: event.target.value })}
                  />
                </label>
                <label className="mail-field">
                  <span>Subject</span>
                  <input
                    ref={subjectRef}
                    value={draft.subject}
                    placeholder="MC {{mc}} — truck available"
                    onFocus={() => {
                      lastField.current = "subject";
                    }}
                    onChange={(event) => patchDraft({ subject: event.target.value })}
                  />
                </label>
                <label className="mail-field mail-field-body">
                  <span>Body</span>
                  <textarea
                    ref={bodyRef}
                    rows={isMobile ? 8 : 12}
                    value={draft.body}
                    placeholder={"Hi {{officer}},\n\nReaching out about {{company}} (MC {{mc}})…"}
                    onFocus={() => {
                      lastField.current = "body";
                    }}
                    onChange={(event) => patchDraft({ body: event.target.value })}
                  />
                </label>

                <div className="mail-tokens">
                  <div className="mail-tokens-head">
                    <strong>Insert fields</strong>
                    <span>Tap to insert</span>
                  </div>
                  <div className="mail-token-row">
                    {(status?.variables || []).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className="mail-token"
                        title={item.label}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertToken(item.token)}
                      >
                        {item.token}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mail-editor-foot">
                  <label className="mail-check">
                    <input
                      type="checkbox"
                      checked={draft.isDefault}
                      onChange={(event) => patchDraft({ isDefault: event.target.checked })}
                    />
                    Default template
                  </label>
                  <div className="mail-editor-actions">
                    <button
                      type="button"
                      className="primary"
                      disabled={Boolean(busy) || !draft.name.trim() || !draft.subject.trim() || !draft.body.trim()}
                      onClick={() => void saveTemplate()}
                    >
                      {busy === "save" ? "Saving…" : isCreating ? "Create" : "Save"}
                    </button>
                    {!isMobile ? (
                      <button type="button" className="ghost" onClick={() => openComposeEmail()}>
                        Compose
                      </button>
                    ) : null}
                    {selected ? (
                      <button
                        type="button"
                        className="ghost danger-ghost"
                        disabled={Boolean(busy)}
                        onClick={() => void removeTemplate(selected)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {showPreview && !isMobile ? (
                <aside className="mail-preview" aria-label="Template preview">
                  <div className="mail-preview-head">
                    <strong>Preview</strong>
                    <span>Sample fill</span>
                  </div>
                  <div className="mail-preview-card">
                    <div className="mail-preview-meta">
                      <span>To</span>
                      <em>{PREVIEW_VARS.email}</em>
                    </div>
                    <div className="mail-preview-meta">
                      <span>Subject</span>
                      <em>{previewSubject || "(no subject)"}</em>
                    </div>
                    <pre className="mail-preview-body">{previewBody || "Preview appears as you type."}</pre>
                  </div>
                </aside>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
