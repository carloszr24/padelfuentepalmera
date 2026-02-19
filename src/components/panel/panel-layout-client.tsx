'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/ui/logout-button';
import { PanelMobileNav } from '@/components/ui/panel-mobile-nav';
import { PanelUserProvider, type PanelProfile, type PanelUserSerialized } from '@/contexts/panel-user-context';
import { PanelLayoutInner } from './panel-layout-inner';

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
        <PanelLayoutInner>{children}</PanelLayoutInner>
        <PanelMobileNav />
      </div>
    </PanelUserProvider>
  );
}
