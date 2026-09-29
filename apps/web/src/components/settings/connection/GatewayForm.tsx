"use client";
import { useEffect, useId, useState, type FormEvent } from "react";
import { CircleAlert } from "lucide-react";
import { useAutolab } from "@/providers/autolab-context";
import { cleanGateway, gatewayProblem } from "./gateway-url";

/**
 * Where this browser finds the gateway. Saving points the socket at the new
 * address straight away, so the status row above shows whether it worked.
 */
export function GatewayForm() {
  const { gateway, setGateway, reconnect, notify } = useAutolab();
  const [draft, setDraft] = useState(gateway);
  const [problem, setProblem] = useState<string | null>(null);
  const inputId = useId();
  const problemId = useId();

  // The saved value loads from storage after the first render, so follow it.
  useEffect(() => {
    setDraft(gateway);
    setProblem(null);
  }, [gateway]);

  const unchanged = cleanGateway(draft) === gateway;

  function save(event: FormEvent) {
    event.preventDefault();
    const found = gatewayProblem(draft);
    setProblem(found);
    if (found || unchanged) return;
    setGateway(cleanGateway(draft));
    reconnect();
    notify("Gateway saved", "success");
  }

  return (
    <form className="settings-row settings-gateway" onSubmit={save} noValidate>
      <label className="settings-row__label" htmlFor={inputId}>
        Gateway URL
      </label>
      <div className="settings-gateway__line">
        <input
          id={inputId}
          className="input mono settings-gateway__input"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="wss://gateway.example.com"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setProblem(null);
          }}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? problemId : undefined}
        />
        <button type="submit" className="btn btn--primary" disabled={unchanged || !draft.trim()}>
          Save
        </button>
      </div>
      {problem ? (
        <p id={problemId} className="settings-gateway__problem" role="alert">
          <CircleAlert size={16} strokeWidth={1.8} aria-hidden="true" />
          {problem}
        </p>
      ) : null}
    </form>
  );
}
