"use client";
import { CameraStep } from "./steps/CameraStep";
import { DiscoverStep } from "./steps/DiscoverStep";
import { ManualForm } from "./steps/ManualForm";
import { PowerStep } from "./steps/PowerStep";
import { ReadyStep } from "./steps/ReadyStep";
import { WifiForm } from "./steps/WifiForm";
import type { ConnectFlow } from "./use-connect-flow";
import { STEP } from "./wizard-steps";

/** The right side of the wizard: whichever step is current, wired to the flow. */
export function StepContent({ flow, onClose }: { flow: ConnectFlow; onClose: () => void }) {
  switch (flow.step) {
    case STEP.camera:
      return <CameraStep onDone={() => flow.goTo(STEP.power)} />;
    case STEP.power:
      return <PowerStep onDone={() => flow.goTo(STEP.discover)} />;
    case STEP.discover:
      return (
        <DiscoverStep
          supported={flow.bluetoothSupported}
          busy={flow.busy}
          message={flow.message}
          onFind={() => void flow.findAutolab()}
          onManual={flow.chooseManual}
        />
      );
    case STEP.device:
      return flow.path === "bluetooth" ? (
        <WifiForm
          busy={flow.busy}
          waiting={flow.waiting}
          message={flow.message}
          state={flow.provisionState}
          currentWifi={flow.currentWifi}
          onSubmit={flow.sendWifi}
          onManual={flow.chooseManual}
          onStop={flow.stopWaiting}
        />
      ) : (
        <ManualForm
          mode={flow.mode}
          gateway={flow.gateway}
          busy={flow.busy}
          waiting={flow.waiting}
          message={flow.message}
          onSubmit={flow.connectManually}
          onStop={flow.stopWaiting}
        />
      );
    default:
      return <ReadyStep onOpen={onClose} />;
  }
}
