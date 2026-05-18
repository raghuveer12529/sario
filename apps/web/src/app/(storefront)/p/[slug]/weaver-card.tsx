interface WeaverCardProps {
  vendorName: string;
  region?: string | undefined;
  story: string;
}

export function WeaverCard({ vendorName, region, story }: WeaverCardProps) {
  return (
    <div className="rounded-2xl border border-[#E8D5E8] bg-gradient-to-br from-[#F9F0F9] to-[#FDF5FF] p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Monogram avatar */}
        <div className="shrink-0 h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-inner border-2 border-primary/20">
          <span className="text-xl font-bold text-primary uppercase">
            {vendorName.charAt(0)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary/60 mb-0.5">
            Master Weaver
          </p>
          <p className="text-base font-bold text-[#1A1A1A] leading-tight truncate">
            {vendorName}
          </p>
          {region && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <svg className="h-3 w-3 text-primary/60 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="text-xs text-[#696969] font-medium">{region} Craft Cluster</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-primary/10 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-2">
          Weaver&apos;s Story
        </p>
        <p className="text-sm text-[#4D4D4D] leading-relaxed">{story}</p>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2.5 border border-primary/10">
        <svg className="h-4 w-4 text-primary/70 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <p className="text-[11px] font-semibold text-[#696969]">
          Verified by Sario — Fair trade pricing, authentic craft
        </p>
      </div>
    </div>
  );
}
