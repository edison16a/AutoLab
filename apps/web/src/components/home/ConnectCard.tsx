"use client";
import { Plug } from "lucide-react";
import { useAutolab } from "@/providers/autolab-context";

/** Takes the device card's place until an Autolab has been added. */
export function ConnectCard() {
  const { openConnect } = useAutolab();

  return (
    <section className="panel home-connect" aria-labelledby="home-connect-title">
      <span className="home-connect__icon" aria-hidden="true">
        <Plug size={20} strokeWidth={1.8} />
      </span>
      <h2 id="home-connect-title" className="home-connect__title">
        Connect your Autolab
      </h2>
      <p className="home-connect__text">Pair the Pi to see its status and take photos.</p>
      <button type="button" className="btn btn--primary" onClick={openConnect}>
        Connect device
      </button>
    </section>
  );
}
