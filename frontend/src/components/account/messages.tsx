"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { Conversation, Message } from "@/lib/types";
import { useRequireAuth } from "@/lib/use-require-auth";
import { Icon } from "../icons";
import { useApiErrorToast } from "../providers";
import { Avatar, Photo, Spinner } from "../ui";

/** Simple renter ↔ host threads: list on the left, conversation on the right (stacked on phones). */
export function Messages({ activeId }: { activeId?: number }) {
  const t = useTranslations("Messages");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const { allowed } = useRequireAuth();
  const onError = useApiErrorToast();
  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [msgs, setMsgs] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const loadConvos = useCallback(() => {
    api<Conversation[]>("/api/conversations").then(setConvos).catch(() => setConvos([]));
  }, []);
  const loadThread = useCallback(() => {
    if (!activeId) return;
    api<Message[]>(`/api/conversations/${activeId}/messages`)
      .then(setMsgs)
      .catch(() => setMsgs([]));
  }, [activeId]);

  useEffect(() => {
    if (!allowed) return;
    loadConvos();
    loadThread();
    const iv = setInterval(() => {
      loadThread();
      loadConvos();
    }, 12000);
    return () => clearInterval(iv);
  }, [allowed, loadConvos, loadThread]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeId) return;
    setBusy(true);
    try {
      const m = await api<Message>(`/api/conversations/${activeId}/messages`, { method: "POST", body: { body: text.trim() } });
      setMsgs((xs) => [...(xs ?? []), m]);
      setText("");
      loadConvos();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!allowed || !convos) return <div className="flex justify-center py-24"><Spinner /></div>;
  const active = convos.find((c) => c.id === activeId);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-10">
      <h1 className={`text-[28px] font-semibold tracking-[-0.02em] ${activeId ? "hidden md:block" : ""}`}>{t("title")}</h1>
      <div className="mt-6 grid overflow-hidden rounded-card border border-hair md:h-[70vh] md:grid-cols-[340px_1fr]">
        <nav aria-label={t("title")} className={`overflow-y-auto border-hair md:border-r ${activeId ? "hidden md:block" : ""}`}>
          {convos.length === 0 ? (
            <p className="p-6 text-foggy">{t("empty")}</p>
          ) : (
            <ul>
              {convos.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/messages/${c.id}`}
                    aria-current={c.id === activeId ? "page" : undefined}
                    className={`flex gap-3 border-b border-hair p-4 transition-colors ${c.id === activeId ? "bg-faint" : "hover:bg-faint/60"}`}
                  >
                    <Avatar name={c.other.name} src={c.other.avatarUrl} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate ${c.unreadCount ? "font-semibold" : "font-medium"}`}>{c.other.name}</span>
                        <span className="num shrink-0 text-[12px] text-foggy">{fmtDate(c.lastMessageAt, locale, { day: "numeric", month: "short" })}</span>
                      </span>
                      <span className="block truncate text-[13px] text-foggy">{c.listing.title}</span>
                      <span className={`block truncate text-[14px] ${c.unreadCount ? "text-hof" : "text-foggy"}`}>{c.lastMessage}</span>
                    </span>
                    {c.unreadCount > 0 && <span className="num mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-coral-deep text-[11px] text-white">{c.unreadCount}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <section aria-label={active ? active.other.name : t("select")} className={`flex min-h-[60vh] flex-col md:min-h-0 ${activeId ? "" : "hidden md:flex"}`}>
          {!activeId || !active ? (
            <div className="flex flex-1 items-center justify-center p-8 text-foggy">
              <Icon name="message" size={28} className="mr-3" /> {t("select")}
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-hair p-4">
                <Link href="/messages" className="-ml-2 flex size-11 items-center justify-center rounded-full hover:bg-faint md:hidden" aria-label={tc("back")}>
                  <Icon name="chevronLeft" />
                </Link>
                <Link href={`/listing/${active.listing.id}`} className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-deco">
                  <Photo src={active.listing.coverUrl} alt="" fill sizes="44px" className="object-cover" />
                </Link>
                <div className="min-w-0">
                  <p className="truncate font-medium">{active.other.name}</p>
                  <p className="truncate text-[13px] text-foggy">{t("about", { title: active.listing.title })}</p>
                </div>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
                {!msgs ? (
                  <Spinner />
                ) : (
                  msgs.map((m) => (
                    <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-[18px] px-4 py-2.5 ${m.mine ? "rounded-br-md bg-hof text-white" : "rounded-bl-md bg-faint text-hof"}`}>
                        <span className="sr-only">{m.mine ? t("you") : active.other.name}: </span>
                        <p className="whitespace-pre-line text-[15px] leading-snug">{m.body}</p>
                        <p className={`num mt-1 text-right text-[11px] ${m.mine ? "text-white/70" : "text-foggy"}`}>{fmtDate(m.createdAt, locale, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={end} />
              </div>
              <form onSubmit={send} className="flex items-end gap-2 border-t border-hair p-3">
                <label htmlFor="msg-input" className="sr-only">
                  {t("label")}
                </label>
                <textarea
                  id="msg-input"
                  rows={1}
                  value={text}
                  maxLength={2000}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={t("placeholder")}
                  className="market-input !min-h-12 flex-1 resize-none !rounded-[24px] !py-3"
                />
                <button type="submit" disabled={busy || !text.trim()} aria-label={tc("send")} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-hof text-white disabled:opacity-40">
                  <Icon name="arrowUp" size={20} strokeWidth={2} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
