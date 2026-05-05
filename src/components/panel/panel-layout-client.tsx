'use client';

import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/ui/logout-button';
import { PanelMobileNav } from '@/components/ui/panel-mobile-nav';
import { PanelUserProvider, type PanelProfile, type PanelUserSerialized } from '@/contexts/panel-user-context';
import { PanelLayoutInner } from './panel-layout-inner';
import { PanelTournamentPromoModal } from './panel-tournament-promo-modal';

type PanelLayoutClientProps = {
  initialUser: PanelUserSerialized | null;
  initialProfile: PanelProfile;
  children: ReactNode;
};

export function PanelLayoutClient({
  initialUser,
  initialProfile,
  children,
}: PanelLayoutClientProps) {
  return (
    <PanelUserProvider initialUser={initialUser} initialProfile={initialProfile}>
      <div data-panel className="min-h-[100dvh]">
        {initialUser?.id ? <PanelTournamentPromoModal userId={initialUser.id} /> : null}
        <PanelLayoutInner>{children}</PanelLayoutInner>
        <PanelMobileNav />
      </div>
    </PanelUserProvider>
  );
}
