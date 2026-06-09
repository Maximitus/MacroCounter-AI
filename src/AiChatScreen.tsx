/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {Loader2, Plus, Send, Sparkles, Trash2, X} from 'lucide-react';
import {SubAppHeader} from './SubAppHeader.tsx';
import {generateChat, type GeminiPart} from './geminiBridge';
import {buildNutritionCoachSystemInstruction, type NutritionCoachInputs} from './aiCoachContext';
import {promptNutritionCoachChatWithAttachment} from './aiPrompts';
import {
  AI_ATTACHMENT_ACCEPT,
  attachmentSummaryLabel,
  fileToAiAttachment,
  geminiInlinePart,
  revokeAiAttachmentPreview,
  type AiAttachment,
} from './aiAttachments.ts';
import {AiAttachmentChip} from './AiAttachmentChip.tsx';

const STORAGE_MESSAGES = 'macrocounter_ai_chat_messages_v1';

const COMPOSER_HINT =
  'Ask about meals and macros. Attach a photo or PDF (bloodwork, body composition, nutrition labels) for context. Not medical advice.';

export type AiChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

function loadMessages(storageKey: string): AiChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is AiChatMessage =>
        m != null &&
        typeof m === 'object' &&
        typeof (m as AiChatMessage).id === 'string' &&
        ((m as AiChatMessage).role === 'user' || (m as AiChatMessage).role === 'assistant') &&
        typeof (m as AiChatMessage).text === 'string',
    );
  } catch {
    return [];
  }
}

function saveMessages(storageKey: string, messages: AiChatMessage[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  } catch {
    /* ignore quota */
  }
}

const SUGGESTIONS = [
  'What should I eat for dinner to hit my protein goal?',
  'How am I doing on calories today?',
  'Suggest a snack that fits my remaining macros.',
];

export function AiChatScreen({
  coachInputs,
  onClose,
  storageKey = STORAGE_MESSAGES,
  title = 'Coach',
  subtitle,
  suggestions = SUGGESTIONS,
  emptyHint = 'Ask about meals, macros, or daily goals.',
  layout = 'fullscreen',
}: {
  coachInputs: NutritionCoachInputs;
  onClose: () => void;
  storageKey?: string;
  title?: string;
  subtitle?: string;
  suggestions?: string[];
  emptyHint?: string;
  layout?: 'fullscreen' | 'modal';
}) {
  const [messages, setMessages] = useState<AiChatMessage[]>(() => loadMessages(storageKey));
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<AiAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveMessages(storageKey, messages);
  }, [storageKey, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages, sending]);

  useEffect(
    () => () => {
      revokeAiAttachmentPreview(attachment);
    },
    [attachment],
  );

  const clearChat = useCallback(() => {
    if (!confirm('Clear all messages in this chat?')) return;
    setMessages([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const attachFile = useCallback(async (file: File) => {
    try {
      const next = await fileToAiAttachment(file);
      setAttachment((prev) => {
        revokeAiAttachmentPreview(prev);
        return next;
      });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Could not attach file.');
    }
  }, []);

  const clearAttachment = useCallback(() => {
    setAttachment((prev) => {
      revokeAiAttachmentPreview(prev);
      return null;
    });
  }, []);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachment) || sending) return;

    const attachmentNote = attachment ? `\n[Attached: ${attachmentSummaryLabel(attachment)}]` : '';
    const displayText = trimmed ? `${trimmed}${attachmentNote}` : attachmentNote.trim();

    const userMsg: AiChatMessage = {
      id: `${Date.now()}-u`,
      role: 'user',
      text: displayText,
    };
    setInput('');
    const pendingAttachment = attachment;
    setAttachment(null);
    setSending(true);

    const MAX_MESSAGES = 24;
    const nextMessages = [...messagesRef.current, userMsg];
    const priorForApi =
      nextMessages.length > MAX_MESSAGES ? nextMessages.slice(-MAX_MESSAGES) : nextMessages;
    setMessages(nextMessages);

    const systemInstruction = buildNutritionCoachSystemInstruction(coachInputs);
    const contents: {role: 'user' | 'model'; parts: GeminiPart[]}[] = [];
    for (let i = 0; i < priorForApi.length; i++) {
      const m = priorForApi[i];
      const isLastUser = i === priorForApi.length - 1 && m.role === 'user';
      if (isLastUser && pendingAttachment) {
        contents.push({
          role: 'user',
          parts: [
            {text: promptNutritionCoachChatWithAttachment(trimmed)},
            geminiInlinePart(pendingAttachment),
          ],
        });
      } else {
        contents.push({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{text: m.text}],
        });
      }
    }

    try {
      const replyText = await generateChat({
        contents,
        systemInstruction,
      });
      const assistantMsg: AiChatMessage = {
        id: `${Date.now()}-a`,
        role: 'assistant',
        text: replyText.trim(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
      const err = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: 'assistant',
          text: `Sorry — something went wrong (${err}). Check that GEMINI_API_KEY is set on the Worker.`,
        },
      ]);
    } finally {
      revokeAiAttachmentPreview(pendingAttachment);
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [attachment, coachInputs, input, sending]);

  const isModal = layout === 'modal';
  const canSend = !sending && (input.trim().length > 0 || attachment != null);

  return (
    <div
      className={
        isModal
          ? 'flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--color-bg-dark)] text-fg'
          : 'flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[var(--color-bg-dark)] text-fg'
      }
    >
      <SubAppHeader
        title={title}
        subtitle={subtitle ?? undefined}
        onBack={isModal ? undefined : onClose}
        backIcon="arrow"
        backLabel="Back to app"
        flush
        headerLeft={
          isModal ? (
            <button
              type="button"
              onClick={clearChat}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
              aria-label="Clear chat"
            >
              <Trash2 className="h-5 w-5" aria-hidden />
            </button>
          ) : undefined
        }
        headerRight={
          isModal ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg transition hover:bg-[var(--color-surface)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={clearChat}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-light)] transition hover:bg-[var(--color-surface)] hover:text-fg"
              aria-label="Clear chat"
            >
              <Trash2 className="h-5 w-5" aria-hidden />
            </button>
          )
        }
      />

      <div
        className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-2"
        style={{WebkitOverflowScrolling: 'touch'}}
      >
        {messages.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center px-4 text-center ${
              isModal ? 'min-h-0 flex-1 py-6' : 'min-h-[min(60vh,24rem)] pb-8 pt-12'
            }`}
          >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-accent)]/20 bg-gradient-to-br from-[var(--color-accent)]/30 to-[var(--color-accent)]/10 shadow-lg">
              <Sparkles className="h-8 w-8 text-[var(--color-accent)]" aria-hidden />
            </div>
            <h2 className="text-xl font-semibold text-fg">How can I help?</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--color-text-light)]">
              {COMPOSER_HINT}
            </p>
            <div className="mt-6 w-full max-w-md space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="w-full rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] px-4 py-3 text-left text-sm text-fg transition hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-panel-hover)]"
                  onClick={() => {
                    setInput(s);
                    textareaRef.current?.focus();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4 pb-4 pt-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[min(100%,85%)] rounded-[1.25rem] px-4 py-2.5 text-[15px] leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-md border border-[var(--color-accent)]/25 bg-[var(--color-surface)] text-fg shadow-sm'
                      : 'rounded-bl-md border border-[var(--color-accent)]/12 bg-[var(--color-surface)] text-fg shadow-sm'
                  }`}
                >
                  <span className="sr-only">{m.role === 'user' ? 'You: ' : 'Coach: '}</span>
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-[1.25rem] rounded-bl-md border border-[var(--color-accent)]/12 bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-light)]">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  Thinking…
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} className="h-px w-full shrink-0" aria-hidden />
          </div>
        )}
      </div>

      <div
        className={`shrink-0 border-t border-[var(--color-accent)]/12 bg-[var(--color-bg-dark)]/95 px-3 pt-2 backdrop-blur-md ${
          isModal ? 'pb-3' : 'pb-[max(0.75rem,env(safe-area-inset-bottom))]'
        }`}
      >
        <div className="mx-auto max-w-3xl space-y-2">
          {attachment ? (
            <AiAttachmentChip attachment={attachment} onRemove={clearAttachment} />
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept={AI_ATTACHMENT_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void attachFile(f);
            }}
          />
          <div className="flex items-end gap-2 rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-surface)] p-2">
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-text-light)] transition hover:bg-[var(--color-panel-hover)] hover:text-fg disabled:opacity-60"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              aria-label="Attach photo or PDF"
            >
              <Plus className="h-5 w-5" aria-hidden />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Message…"
              disabled={sending}
              className="max-h-[120px] min-h-[40px] w-full min-w-0 flex-1 resize-none bg-transparent py-2 text-[15px] text-fg placeholder:text-[var(--color-text-light)] outline-none disabled:opacity-60"
            />
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-accent)] transition hover:bg-[var(--color-panel-hover)] disabled:opacity-40 disabled:text-[var(--color-text-light)]"
              onClick={() => void send()}
              disabled={!canSend}
              aria-label="Send"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Send className="h-5 w-5" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
