import { MountDebugView } from "@/features/game/components/mount-debug-view";
import { ProjectileDebugView } from "@/features/game/components/projectile-debug-view";

export default function MountDebugPage(): React.JSX.Element {
  return (
    <>
      <MountDebugView />
      <ProjectileDebugView />
    </>
  );
}
