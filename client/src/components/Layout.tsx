import { Link, NavLink, Outlet } from "react-router-dom";

export default function Layout() {
	return (
		<div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
			<header className="border-b border-slate-200 bg-white">
				<div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
					<Link
						to="/"
						className="text-sm font-semibold tracking-tight text-slate-900"
					>
						lead magnet generator
					</Link>
					<nav className="flex items-center gap-1 text-sm">
						<NavLinkPill to="/" label="Templates" end />
						<NavLinkPill to="/history" label="History" />
					</nav>
				</div>
			</header>
			<main className="flex-1">
				<Outlet />
			</main>
		</div>
	);
}

function NavLinkPill({
	to,
	label,
	end,
}: {
	to: string;
	label: string;
	end?: boolean;
}) {
	return (
		<NavLink
			to={to}
			end={end}
			className={({ isActive }) =>
				`px-3 py-1.5 rounded-md transition-colors ${
					isActive
						? "bg-slate-900 text-white"
						: "text-slate-600 hover:bg-slate-100"
				}`
			}
		>
			{label}
		</NavLink>
	);
}
