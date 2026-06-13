import Link from 'next/link';

export default function NotFound() {
 return (
 <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
 <div className="flex flex-col items-center gap-4 max-w-sm w-full">
 {/* Logo */}
 <div className="flex items-center justify-center size-14 rounded-2xl border border-primary/20 bg-card shadow-sm overflow-hidden mb-2">
 <img src="/ho_logo.png" alt="House of Oath" className="h-full w-full object-contain p-1.5" />
 </div>

 {/* 404 */}
 <p className="text-7xl font-display font-bold text-primary/30 leading-none tracking-tight select-none">
 404
 </p>

 <div className="space-y-2">
 <h1 className="text-2xl font-display font-bold text-charcoal tracking-tight">
 Page not found
 </h1>
 <p className="text-sm text-gray leading-relaxed">
 The page you&apos;re looking for doesn&apos;t exist or has been moved.
 </p>
 </div>

 <Link
 href="/"
 className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-primary text-charcoal font-bold text-sm tracking-wide rounded-xl shadow-md hover:bg-[#E5C04A] transition-all"
 >
 <span className="material-symbols-outlined text-[18px]">home</span>
 Back to studio
 </Link>
 </div>
 </div>
 );
}
