import {useEffect, useId, useRef, useState} from 'react';
import {Camera} from 'lucide-react';
import {Html5Qrcode} from 'html5-qrcode';
import toast from 'react-hot-toast';
import {parseFriendCodeFromScan} from './friendCode.ts';

type FriendQrScannerProps = {
  onCode: (code: string) => void;
};

async function stopScanner(scanner: Html5Qrcode): Promise<void> {
  try {
    if (scanner.isScanning) {
      await scanner.stop();
    }
  } catch {
    /* already stopped */
  }
  try {
    scanner.clear();
  } catch {
    /* ignore */
  }
}

/** Mount only while the scan panel is open; starts camera on mount and stops on unmount. */
export function FriendQrScanner({onCode}: FriendQrScannerProps) {
  const regionId = useId().replace(/:/g, '');
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    handledRef.current = false;
    let cancelled = false;
    setStarting(true);
    setCameraError(null);

    const scanner = new Html5Qrcode(regionId, {verbose: false});
    scannerRef.current = scanner;

    void scanner
      .start(
        {facingMode: 'environment'},
        {fps: 10, qrbox: {width: 220, height: 220}, aspectRatio: 1},
        (decoded) => {
          if (handledRef.current || cancelled) return;
          const code = parseFriendCodeFromScan(decoded);
          if (!code) return;
          handledRef.current = true;
          void stopScanner(scanner).then(() => {
            scannerRef.current = null;
            onCodeRef.current(code);
          });
        },
        () => {},
      )
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Could not open camera';
        setCameraError(msg);
      })
      .finally(() => {
        if (!cancelled) setStarting(false);
      });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) void stopScanner(s);
    };
  }, [regionId]);

  async function handlePhotoFile(file: File) {
    const fileRegionId = `${regionId}-file`;
    const s = scannerRef.current;
    if (s) {
      await stopScanner(s);
      scannerRef.current = null;
    }
    try {
      const fileScanner = new Html5Qrcode(fileRegionId, {verbose: false});
      const result = await fileScanner.scanFile(file, false);
      fileScanner.clear();
      const code = parseFriendCodeFromScan(result);
      if (!code) {
        toast.error('No friend code found in that image');
        return;
      }
      onCodeRef.current(code);
    } catch {
      toast.error('Could not read QR code from photo');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <div id={`${regionId}-file`} className="hidden" aria-hidden />
      <div className="overflow-hidden rounded-xl border border-[var(--color-accent)]/25 bg-black">
        <div id={regionId} className="min-h-[220px] w-full [&_video]:object-cover" />
        {starting ? (
          <p className="px-3 py-2 text-center text-xs text-[var(--color-text-light)]">Starting camera…</p>
        ) : null}
        {cameraError ? (
          <p className="px-3 py-2 text-center text-xs text-amber-200/90">
            {cameraError}. Allow camera access for maxmvs.com, or use the button below to open your
            camera app.
          </p>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePhotoFile(file);
        }}
      />
      <button
        type="button"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-surface)] py-2.5 text-sm font-medium text-fg hover:bg-[var(--color-panel-hover)]"
        onClick={() => fileInputRef.current?.click()}
      >
        <Camera className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
        Open camera app (photo of QR)
      </button>
      <p className="text-center text-xs text-[var(--color-text-light)]">
        Point your camera at a friend&apos;s QR code, or photograph it with your phone camera.
      </p>
    </div>
  );
}
