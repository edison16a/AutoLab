"""Run the setup window: prepare the adapter, publish the service, clean up after."""

import asyncio
import json
import secrets
import time
from pathlib import Path

from dbus_next import BusType, Variant
from dbus_next.aio import MessageBus

from .dbus_proxy import proxy
from .gatt import ROOT, SERVICE_PATH, Advertisement, Application, Characteristic, Service
from .pairing import PairingAgent
from .session import ProvisioningSession
from .setup_flow import provision

ADAPTER = "org.bluez.Adapter1"
PROPERTIES = "org.freedesktop.DBus.Properties"
ADVERTISEMENT_PATH = ROOT + "/advertisement"
AGENT_PATH = ROOT + "/agent"


async def run(args) -> None:
    """Serve setup until the window closes, then put the adapter back as it was."""
    creds = json.loads(Path(args.credentials).expanduser().read_text())
    session = ProvisioningSession(
        creds["device_id"], f"{secrets.randbelow(1000000):06d}"
    )
    bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
    tasks: set[asyncio.Task] = set()

    def start_setup(ssid: str, password: str) -> None:
        # D-Bus handlers must return quickly, so the slow part runs as a task.
        task = asyncio.create_task(
            provision(
                session, bus, ssid, password, args.gateway, args.mode, args.credentials
            )
        )
        tasks.add(task)
        task.add_done_callback(tasks.discard)

    props = await proxy(bus, "org.bluez", args.adapter, PROPERTIES)
    previous_power = (await props.call_get(ADAPTER, "Powered")).value
    previous_pairable = (await props.call_get(ADAPTER, "Pairable")).value
    await props.call_set(ADAPTER, "Powered", Variant("b", True))
    await props.call_set(ADAPTER, "Pairable", Variant("b", True))
    for path, obj in [
        (ROOT, Application()),
        (SERVICE_PATH, Service()),
        (SERVICE_PATH + "/command", Characteristic("command", session, start_setup)),
        (SERVICE_PATH + "/status", Characteristic("status", session, start_setup)),
        (ADVERTISEMENT_PATH, Advertisement(creds["device_id"])),
        (AGENT_PATH, PairingAgent(session)),
    ]:
        bus.export(path, obj)
    gatt = await proxy(bus, "org.bluez", args.adapter, "org.bluez.GattManager1")
    advertising = await proxy(
        bus, "org.bluez", args.adapter, "org.bluez.LEAdvertisingManager1"
    )
    agents = await proxy(bus, "org.bluez", "/org/bluez", "org.bluez.AgentManager1")
    try:
        await agents.call_register_agent(AGENT_PATH, "NoInputNoOutput")
        await agents.call_request_default_agent(AGENT_PATH)
        await gatt.call_register_application(ROOT, {})
        await advertising.call_register_advertisement(ADVERTISEMENT_PATH, {})
        print(
            f"Autolab setup active for 10 minutes. Device: {creds['device_id']}",
            flush=True,
        )
        print(f"Setup PIN: {session.pin}", flush=True)
        while time.monotonic() < session.deadline:
            await asyncio.sleep(1)
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        # Best effort, one step at a time: one failure must not skip the rest.
        for cleanup in [
            lambda: advertising.call_unregister_advertisement(ADVERTISEMENT_PATH),
            lambda: gatt.call_unregister_application(ROOT),
            lambda: agents.call_unregister_agent(AGENT_PATH),
            lambda: props.call_set(ADAPTER, "Pairable", Variant("b", previous_pairable)),
        ]:
            try:
                await cleanup()
            except Exception:
                pass
        if not previous_power:
            try:
                await props.call_set(ADAPTER, "Powered", Variant("b", False))
            except Exception:
                pass
        bus.disconnect()
