'use client';

/** Profile Upgrade Queue — reference screen `/profile-upgrade-queue`. */

import QueuePage from '@/components/admin/QueuePage';

export default function UpgradeQueuePage() {
  return (
    <QueuePage
      queueType="profile_upgrade"
      title="Profile Upgrade Queue"
      subtitle="Profile upgrade requests awaiting review."
    />
  );
}
