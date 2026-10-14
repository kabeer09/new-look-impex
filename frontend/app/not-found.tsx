import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-ivory">
      <div className="container-x text-center py-20">
        <p className="font-serif font-bold text-7xl md:text-8xl text-gold">404</p>
        <h1 className="font-serif font-bold text-navy text-3xl mt-4">Page not found</h1>
        <p className="text-gray mt-2 max-w-md mx-auto">
          The page you are looking for may have been moved or never existed.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn btn-primary">Public site</Link>
          <Link href="/admin/overview" className="btn btn-outline">Admin dashboard</Link>
        </div>
      </div>
    </div>
  );
}
