export function BrandBadge() {
  return (
    <div className="flex h-14 w-14 items-center justify-center border-2 border-[#5190E6] bg-white shadow-[0_10px_24px_rgba(38,51,98,0.12)]">
      <div className="relative h-8 w-8 overflow-hidden border-[3px] border-[#1CE4DB] bg-white">
        <div className="absolute left-1 top-1 h-5 w-5 rotate-45 border-b-[3px] border-l-[3px] border-[#5190E6]" />
      </div>
    </div>
  );
}
