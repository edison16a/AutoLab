import Link from "next/link";
import { ThemeToggle } from "../ui/ThemeToggle";
import { LogoMark } from "../ui/LogoMark";
import { AccountMenu } from "./AccountMenu";
import { DeviceMenu } from "./DeviceMenu";
import { SiteNav } from "./SiteNav";

/** Name on the left, sections in the middle, device and account on the right. */
export function TopBar() {
  return (
    <header className="top-bar">
      <Link href="/" className="top-bar__name" aria-label="Autolab home">
        <LogoMark size={22} />
        <span>Autolab</span>
      </Link>
      <SiteNav />
      <div className="top-bar__end">
        <DeviceMenu />
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  );
}
