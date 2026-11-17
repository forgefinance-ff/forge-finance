import type React from "react";

/**
 * Peças da tela de entrada (adaptadas do componente "sign-in" do 21st.dev):
 * coluna do formulário com entrada animada, campos "de vidro" e painel à
 * direita com cartões flutuantes. Os textos e o conteúdo vêm de quem usa.
 */

export const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

/** Campo "de vidro": borda suave que fica roxa ao focar. */
export const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="glass-input rounded-2xl border transition-colors">{children}</div>
);

/** Cartão flutuante do painel (no lugar dos depoimentos do original). */
export const HighlightCard = ({
  icon,
  title,
  text,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  delay: string;
}) => (
  <div className={`animate-testimonial ${delay} flex w-64 items-start gap-3 rounded-3xl border border-white/20 bg-white/15 p-5 text-white backdrop-blur-xl`}>
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">{icon}</span>
    <div className="text-sm leading-snug">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-white/80">{text}</p>
    </div>
  </div>
);

type SignInLayoutProps = {
  brand: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Painel da direita (só no computador). */
  hero?: React.ReactNode;
  highlights?: React.ReactNode;
};

export function SignInLayout({ brand, title, description, children, footer, hero, highlights }: SignInLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col md:flex-row">
      <section className="flex flex-1 flex-col p-6 sm:p-8">
        <div className="animate-element animate-delay-100">{brand}</div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <div className="flex flex-col gap-6">
              <h1 className="animate-element animate-delay-100 text-4xl font-semibold leading-tight md:text-5xl">{title}</h1>
              <p className="animate-element animate-delay-200 auth-muted">{description}</p>
              {children}
            </div>
          </div>
        </div>
        {footer && <div className="animate-element animate-delay-900">{footer}</div>}
      </section>

      {hero && (
        <section className="relative hidden flex-1 p-4 md:block">
          <div className="auth-hero animate-slide-right animate-delay-300 absolute inset-4 overflow-hidden rounded-3xl">{hero}</div>
          {highlights && (
            <div className="absolute bottom-8 left-1/2 flex w-full -translate-x-1/2 justify-center gap-4 px-8">{highlights}</div>
          )}
        </section>
      )}
    </div>
  );
}
