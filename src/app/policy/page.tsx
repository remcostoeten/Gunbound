import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Policy | Gunbound Local",
  description: "Fan-made policy notice for Gunbound Local",
};

export default function PolicyPage(): React.JSX.Element {
  return (
    <main className="policy-shell">
      <div className="policy-frame">
        <div className="policy-titlebar">
          <span>POLICY NOTICE</span>
          <span className="policy-title-tag">GUNBOUND LOCAL</span>
        </div>
        <div className="policy-body">
          <p className="policy-lead">
            This project is solely for fun, experimentation, and fan-made play.
          </p>
          <p>
            It is not an official GunBound product, is not affiliated with or endorsed by
            any original publisher, and should be treated as a local hobby project.
          </p>
          <p>
            No commercial intent is attached to this build. Assets, names, and references
            remain in the context of a fan project and should not be used to imply
            ownership, sponsorship, or official support.
          </p>
          <p>
            If you are using this build, do so for personal, non-commercial enjoyment.
          </p>
          <div className="policy-actions">
            <Link className="policy-back" href="/">
              BACK TO LOGIN
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
