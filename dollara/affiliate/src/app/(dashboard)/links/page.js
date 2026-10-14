'use client';

import { useState } from 'react';
import { Link2, Image, Smartphone, Plus } from 'lucide-react';
import { useAffiliateData } from '../../../hooks/useAffiliateData';
import { toast } from '../../../lib/toast';
import LinkDirectoryTab from './_components/LinkDirectoryTab';
import CreativeGalleryTab from './_components/CreativeGalleryTab';
import DeepLinkBuilderTab from './_components/DeepLinkBuilderTab';
import CreateLinkModal from './_components/CreateLinkModal';
import QrCodeModal from './_components/QrCodeModal';





const TABS = [
  { id: 'links',     label: 'Link Directory',    icon: Link2 },
  { id: 'creatives', label: 'Creative Banners',   icon: Image },
  { id: 'deeplink',  label: 'Deep-Link Builder',  icon: Smartphone },
];





export default function LinksPage() {
  
  const [activeTab, setActiveTab] = useState('links');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [qrLink, setQrLink] = useState(null);

  const { data, loading, error, reload } = useAffiliateData(
    '/api/v1/affiliate/links?limit=100',
    [],
  );
  const links = data?.records ?? [];

  // Refetch instead of splicing into local state. The old version invented an
  // id from the array length and kept the row client-side only, so it collided
  // after any delete and vanished on refresh.
  const handleCreated = () => {
    setShowCreateModal(false);
    reload();
    toast.success('Tracking link created');
  };



  return (
   
   <div className="space-y-6 animate-fade-up">

      {/* Header bar */}
    
    
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        <div>

          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            Links & Creatives
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage tracking links, download banner creatives, and build deep links.
          </p>
          
        </div>
        
        
        {activeTab === 'links' && (
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 text-black font-bold text-sm shadow-sm hover:shadow-md hover:brightness-105 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Link
          </button>
        )}
      </div>



       {/* Tab switcher */}
    
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 w-fit">
        
        {TABS.map(({ id, label, icon: Icon }) => (
          
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
            

        
        )
      )
    }

      </div>



      {/* Tab content */}
      {activeTab === 'links' && (
        <LinkDirectoryTab
          links={links}
          loading={loading}
          error={error}
          onReload={reload}
          onShowQr={(link) => setQrLink(link)}
        />
      )}

      {activeTab === 'creatives' && <CreativeGalleryTab />}
      {activeTab === 'deeplink' && <DeepLinkBuilderTab links={links} />}



      {/* Modals */}
      {showCreateModal && (
        <CreateLinkModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
      )}


      {qrLink && (
        <QrCodeModal link={qrLink} onClose={() => setQrLink(null)} />
      )}

      
    </div>
  );
}
