import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F6FA] dark:bg-slate-950">
      <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
    </div>
  );
}
