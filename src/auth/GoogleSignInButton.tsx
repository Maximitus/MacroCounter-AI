import {useTheme} from '../theme.tsx';

type GoogleSignInButtonProps = {
  label?: string;
  disabled?: boolean;
  onClick: () => void;
};

function GoogleLogo({className}: {className?: string}) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.66-4.34 7.44l6.85 6.85c4.03-3.71 6.64-9.26 6.64-15.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-6.85-6.85c-1.78 1.19-4.05 1.9-7.04 1.9-6.27 0-11.58-4.22-13.43-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  label = 'Sign in with Google',
  disabled,
  onClick,
}: GoogleSignInButtonProps) {
  const {theme} = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 w-full items-center justify-center gap-3 rounded border px-3 text-sm font-medium shadow-sm transition hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285f4] disabled:cursor-not-allowed disabled:opacity-50 ${
        isDark
          ? 'border-[var(--color-accent)]/20 bg-[var(--color-surface)] text-fg hover:bg-[var(--color-panel-hover)]'
          : 'border-[#747775] bg-white text-[#1f1f1f] hover:bg-[#f8f9fa]'
      }`}
    >
      <GoogleLogo className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
