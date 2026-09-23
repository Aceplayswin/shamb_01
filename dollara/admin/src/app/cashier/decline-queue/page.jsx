'use client';

/** Decline Queue — reference screen `/decline-queue`. */

import QueuePage from '@/components/admin/QueuePage';

export default function DeclineQueuePage() {
  return (
    <QueuePage
      queueType="decline"
      title="Decline Queue"
      subtitle="Declined payments awaiting review."
    />
  );
}
