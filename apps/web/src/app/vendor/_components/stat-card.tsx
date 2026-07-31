interface Props {
  label: string;
  value: string | number;
  loading?: boolean;
}

export function StatCard({ label, value, loading }: Props) {
  if (loading) {
    return <div className="h-24 animate-pulse rounded-xl bg-[#F0F0F0]" />;
  }
  return (
    <div className="rounded-xl border border-[#F0F0F0] bg-white p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9B9B9B]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-[#1A1A1A]">{value}</p>
    </div>
  );
}
