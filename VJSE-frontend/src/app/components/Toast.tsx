interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  return (
    <div className="fixed right-4 bottom-4 z-50 w-full max-w-[360px] rounded-3xl border border-[#1F2937] bg-[#111111] p-4 shadow-2xl shadow-black/50">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-3 w-3 rounded-full bg-[#3B82F6]" />
        <div>
          <p className="text-sm font-semibold text-white">✓ Lead submitted successfully!</p>
          <p className="text-sm text-[#9CA3AF]">{message}</p>
        </div>
      </div>
    </div>
  );
}
