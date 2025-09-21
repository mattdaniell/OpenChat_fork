'use client';

import { useState } from 'react';
import { useBreakpoint } from '@/app/hooks/use-breakpoint';
import { useUser } from '@/app/providers/user-provider';
import { Button } from '@/components/ui/button';
import { UpgradeDrawer } from './upgrade-drawer';
import { UpgradeModal } from './upgrade-modal';

export function UpgradeButton() {
  const { user, hasPremium, isLoading } = useUser();
  const isMobile = useBreakpoint(768);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Don't show for anonymous users, premium users, or while loading
  if (!user || user.isAnonymous || hasPremium || isLoading) {
    return null;
  }

  const upgradeButton = (
    <Button
      onClick={() => setIsModalOpen(true)}
      size="sm"
      variant="outline"
    >
      Upgrade
    </Button>
  );

  if (isMobile) {
    return (
      <UpgradeDrawer
        trigger={upgradeButton}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    );
  }

  return (
    <>
      {upgradeButton}
      <UpgradeModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
