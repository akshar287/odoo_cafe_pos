import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, oklch(0.58 0.22 28) 0%, oklch(0.68 0.19 28) 40%, oklch(0.78 0.14 35) 100%)',
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'oklch(0.88 0.09 35)' }} />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'oklch(0.58 0.22 28)' }} />
        <div className="absolute top-1/3 right-8 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'oklch(0.98 0.005 35)' }} />

        {/* Brand content */}
        <div className="relative z-10 text-center px-12 max-w-md">
          {/* Logo / Icon */}
          <div className="mx-auto mb-8 w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{ background: 'oklch(0.98 0.005 35 / 20%)' }}>
            <span className="text-5xl">☕</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Odoo Cafe POS
          </h1>
          <p className="text-white/80 text-lg leading-relaxed mb-8">
            Smart restaurant management at your fingertips. Manage orders, track tables, and grow your business.
          </p>

          {/* Feature bullets */}
          <div className="space-y-3 text-left">
            {[
              { icon: '🏪', text: 'Multi-floor table management' },
              { icon: '📋', text: 'Real-time Kitchen Display System' },
              { icon: '💳', text: 'Flexible payment methods' },
              { icon: '📊', text: 'Sales analytics & reports' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-white/85 text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <span className="text-white/50 text-xs">© 2025 Odoo Cafe · All rights reserved</span>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12"
        style={{ background: 'oklch(0.985 0.005 35)' }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <span className="text-4xl">☕</span>
          <span className="text-2xl font-bold" style={{ color: 'oklch(0.68 0.19 28)' }}>
            Odoo Cafe POS
          </span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-3xl font-bold" style={{ color: 'oklch(0.2 0.02 30)' }}>
              Welcome back
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'oklch(0.5 0.02 30)' }}>
              Sign in to your account to continue
            </p>
          </div>

          <SignIn
            appearance={{
              variables: {
                colorPrimary: 'oklch(0.68 0.19 28)',
                colorBackground: 'oklch(1 0 0)',
                borderRadius: '0.75rem',
                fontFamily: 'var(--font-geist-sans), sans-serif',
              },
              elements: {
                card: 'shadow-none border-0 bg-transparent p-0',
                rootBox: 'w-full',
                formButtonPrimary:
                  'bg-[oklch(0.68_0.19_28)] hover:bg-[oklch(0.62_0.21_28)] text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg',
                formFieldInput:
                  'border border-[oklch(0.9_0.02_35)] rounded-xl focus:ring-2 focus:ring-[oklch(0.68_0.19_28)] transition-all duration-150',
                footerActionLink:
                  'text-[oklch(0.68_0.19_28)] hover:text-[oklch(0.58_0.22_28)] font-medium',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton:
                  'border border-[oklch(0.9_0.02_35)] rounded-xl hover:bg-[oklch(0.95_0.015_35)] transition-all duration-150',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
