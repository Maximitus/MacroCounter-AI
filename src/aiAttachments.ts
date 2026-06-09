export type AiAttachment = {
  fileName: string;
  mimeType: string;
  /** Base64 payload (no data-URL prefix). */
  data: string;
  /** Blob URL for image previews; revoke when clearing. */
  previewUrl?: string;
};

export const AI_ATTACHMENT_ACCEPT = 'image/*,application/pdf';
export const MAX_AI_ATTACHMENT_BYTES = 12 * 1024 * 1024;

export function isAcceptedAiAttachment(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  if (file.type === 'application/pdf') return true;
  const lower = file.name.toLowerCase();
  return lower.endsWith('.pdf') || /\.(jpe?g|png|gif|webp|heic|heif)$/.test(lower);
}

export function revokeAiAttachmentPreview(attachment: AiAttachment | null | undefined) {
  if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
}

export async function fileToAiAttachment(file: File): Promise<AiAttachment> {
  if (!isAcceptedAiAttachment(file)) {
    throw new Error('Please choose a PDF or image file.');
  }
  if (file.size > MAX_AI_ATTACHMENT_BYTES) {
    throw new Error('File is too large (max 12 MB).');
  }

  const {data, mimeType} = await new Promise<{data: string; mimeType: string}>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const comma = dataUrl.indexOf(',');
      const payload = comma >= 0 ? dataUrl.slice(comma + 1) : '';
      const mimeMatch = /^data:([^;]+);/.exec(dataUrl);
      let resolvedMime = mimeMatch?.[1] || file.type || 'application/octet-stream';
      if (resolvedMime === 'application/octet-stream' && file.name.toLowerCase().endsWith('.pdf')) {
        resolvedMime = 'application/pdf';
      }
      resolve({data: payload, mimeType: resolvedMime});
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

  const previewUrl = mimeType.startsWith('image/') ? URL.createObjectURL(file) : undefined;
  return {fileName: file.name, mimeType, data, previewUrl};
}

export function geminiInlinePart(attachment: AiAttachment) {
  return {inlineData: {mimeType: attachment.mimeType, data: attachment.data}};
}

export function attachmentSummaryLabel(attachment: AiAttachment): string {
  if (attachment.mimeType === 'application/pdf') return `PDF: ${attachment.fileName}`;
  return `Image: ${attachment.fileName}`;
}
