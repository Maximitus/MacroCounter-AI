import {FileText, ImageIcon, X} from 'lucide-react';
import type {AiAttachment} from './aiAttachments.ts';
import {attachmentSummaryLabel, revokeAiAttachmentPreview} from './aiAttachments.ts';

export function AiAttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: AiAttachment;
  onRemove: () => void;
}) {
  const isPdf = attachment.mimeType === 'application/pdf';
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-bg-dark)] p-2">
      {attachment.previewUrl ? (
        <img
          src={attachment.previewUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-surface)] text-[var(--color-accent)]">
          {isPdf ? <FileText className="h-5 w-5" aria-hidden /> : <ImageIcon className="h-5 w-5" aria-hidden />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{attachment.fileName}</p>
        <p className="truncate text-xs text-[var(--color-text-light)]">{attachmentSummaryLabel(attachment)}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          revokeAiAttachmentPreview(attachment);
          onRemove();
        }}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--color-text-light)] transition hover:bg-white/10 hover:text-fg"
        aria-label={`Remove ${attachment.fileName}`}
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
