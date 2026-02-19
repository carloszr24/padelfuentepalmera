'use client';

import type { ReactNode } from 'react';
import { PanelMobileHeader } from '@/components/panel/panel-mobile-header';
import { PanelTopnav } from '@/components/panel/panel-topnav';

export function PanelLayoutInner({ children }: { children: ReactNode }) {
  return (
    <div
      data-panel
      className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-[var(--panel-bg)] text-[var(--panel-text)]"
      style={{ fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }}
    >
      <PanelTopnav />

      <main
        className="mx-auto w-full max-w-[1280px] px-4 pb-[120px] pt-4 md:mt-16 md:px-12 md:pb-10 md:pt-9"
      >
        <PanelMobileHeader />
        <div className="min-w-0 max-w-full overflow-x-hidden">{children}</div>
      </main>
    </div>
  );
}
