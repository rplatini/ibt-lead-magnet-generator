import { Link, Outlet } from "react-router-dom";

export default function Layout() {
	return (
		<div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
			<header className="border-b border-slate-200 bg-white">
				<div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
					<Link
						to="/"
						className="text-sm font-semibold tracking-tight text-slate-900"
					>
						lead magnet generator
					</Link>
				</div>
			</header>
			<main className="flex-1">
				<Outlet />
			</main>
		</div>
	);
}
