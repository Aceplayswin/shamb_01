'use client';

import { useState } from 'react';
import { 
  AdminShell,
  DataTable,
  StatusBadge,
  Button,
  confirmDialog,
  toast,
  fmtDate,
  Modal,
  Field,
  Input,
  Textarea
} from '@/components/admin/AdminShell';
import { mockPayoutRequests } from '@/lib/affiliateMockData';
import { Check, X } from 'lucide-react';

export default function PayoutApprovalsPage() {
  const [requests, setRequests] = useState(mockPayoutRequests);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Modals state
  const [approveData, setApproveData] = useState(null); // holds row data
  const [rejectData, setRejectData] = useState(null);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  // Bulk actions
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirmDialog({
      title: 'Bulk Approve',
      text: `Approve ${selectedIds.length} payout requests? You will need to process the actual payments manually.`,
      confirmText: 'Mark as Paid'
    });
    if (ok) {
      setRequests(prev => prev.map(req => 
        selectedIds.includes(req.id) ? { ...req, status: 'paid', reference: 'BULK-APP' } : req
      ));
      setSelectedIds([]);
      toast.success(`${selectedIds.length} payouts approved`);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirmDialog({
      title: 'Bulk Reject',
      text: `Reject ${selectedIds.length} payout requests?`,
      confirmText: 'Reject All',
      icon: 'warning'
    });
    if (ok) {
      setRequests(prev => prev.map(req => 
        selectedIds.includes(req.id) ? { ...req, status: 'rejected' } : req
      ));
      setSelectedIds([]);
      toast.success(`${selectedIds.length} payouts rejected`);
    }
  };

  // Single actions
  const submitApprove = (e) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setRequests(prev => prev.map(req => 
        req.id === approveData.id ? { ...req, status: 'paid', reference } : req
      ));
      toast.success('Payout marked as paid');
      setApproveData(null);
      setReference('');
      setBusy(false);
    }, 500);
  };

  const submitReject = (e) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setRequests(prev => prev.map(req => 
        req.id === rejectData.id ? { ...req, status: 'rejected' } : req
      ));
      toast.success('Payout rejected');
      setRejectData(null);
      setReason('');
      setBusy(false);
    }, 500);
  };

  const columns = [
    { key: 'affiliate_name', label: 'Affiliate', render: (r) => (
      <div>
        <p className="font-medium text-white">{r.affiliate_name}</p>
        <p className="text-xs text-amber-400">{r.tier} Tier</p>
      </div>
    )},
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-bold text-emerald-400">${r.amount.toLocaleString()}</span> },
    { key: 'method', label: 'Payout Method', render: (r) => (
      <div>
        <p className="text-slate-300">{r.method}</p>
        <p className="text-xs text-slate-500 font-mono">{r.details}</p>
      </div>
    )},
    { key: 'requested_at', label: 'Requested', render: (r) => fmtDate(r.requested_at) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', render: (r) => (
      r.status === 'pending' ? (
        <div className="flex justify-end gap-2">
          <Button variant="success" size="sm" onClick={() => setApproveData(r)}>
            <Check size={16} />
          </Button>
          <Button variant="danger" size="sm" onClick={() => setRejectData(r)}>
            <X size={16} />
          </Button>
        </div>
      ) : (
        <div className="text-right text-xs text-slate-500 font-mono">
          {r.reference && `Ref: ${r.reference}`}
        </div>
      )
    )}
  ];

  return (
    <AdminShell title="Payout Approvals">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Pending Requests</h2>
          <p className="text-slate-400">Review and approve affiliate withdrawal requests</p>
        </div>
        
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-4 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
            <span className="text-sm text-slate-300 font-medium">
              {selectedIds.length} selected
            </span>
            <div className="flex gap-2">
              <Button variant="success" size="sm" onClick={handleBulkApprove}>Approve All</Button>
              <Button variant="danger" size="sm" onClick={handleBulkReject}>Reject All</Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          rows={requests}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      {/* Approve Modal */}
      <Modal 
        isOpen={!!approveData} 
        onClose={() => !busy && setApproveData(null)}
        title="Mark Payout as Paid"
      >
        {approveData && (
          <form onSubmit={submitApprove} className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
              <p className="text-sm text-emerald-400 font-medium">Amount to pay: ${approveData.amount}</p>
              <p className="text-xs text-slate-400 mt-1">Method: {approveData.method} ({approveData.details})</p>
            </div>
            <p className="text-sm text-slate-300">
              Please manually process the payment using the details above. Once paid, enter the transaction reference to mark it as complete.
            </p>
            <Field label="Transaction Reference (optional)">
              <Input 
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. TXN-123456"
                disabled={busy}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => setApproveData(null)} disabled={busy}>Cancel</Button>
              <Button type="submit" variant="success" busy={busy}>Confirm Paid</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal 
        isOpen={!!rejectData} 
        onClose={() => !busy && setRejectData(null)}
        title="Reject Payout"
      >
        {rejectData && (
          <form onSubmit={submitReject} className="space-y-4">
            <p className="text-sm text-slate-300">
              Rejecting this request will return the ${rejectData.amount} back to {rejectData.affiliate_name}'s available balance.
            </p>
            <Field label="Rejection Reason (sent to affiliate)">
              <Textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Invalid bank details provided"
                disabled={busy}
                required
              />
            </Field>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => setRejectData(null)} disabled={busy}>Cancel</Button>
              <Button type="submit" variant="danger" busy={busy}>Reject Payout</Button>
            </div>
          </form>
        )}
      </Modal>

    </AdminShell>
  );
}
