"""Opt-in, 10-minute BlueZ GATT provisioning service for Raspberry Pi OS.

Run only during physical setup. Encrypted ATT + OS pairing + a terminal PIN are
required before accepting Wi-Fi credentials. NetworkManager stores network
secrets. The device secret and gateway service key never travel over Bluetooth.
"""

import argparse
import asyncio
import json
import os
import secrets
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

SERVICE_UUID = "f7a10000-76b8-4f58-9b31-879c4e198a10"
COMMAND_UUID = "f7a10001-76b8-4f58-9b31-879c4e198a10"
STATUS_UUID = "f7a10002-76b8-4f58-9b31-879c4e198a10"
ROOT = "/com/autolab/setup"


class ProvisioningSession:
    """Pure framing and validation, independently testable without Bluetooth."""

    def __init__(self, device_id, pin, ttl=600):
        self.device_id = device_id
        self.pin = pin
        self.deadline = time.monotonic() + ttl
        self.buffers = {}
        self.attempts = 0
        self.busy = False
        self.completed = False
        self.authorized_peer = None
        self.status = {"state": "ready", "device_id": device_id}

    def receive(self, peer, chunk):
        if time.monotonic() > self.deadline:
            raise ValueError("Setup window expired. Restart provisioning on the Pi.")
        if self.busy or self.completed:
            raise ValueError("Setup already in progress or completed")
        if self.attempts >= 5:
            raise ValueError("Too many failed PIN attempts. Restart provisioning.")
        if not isinstance(chunk, bytes) or len(chunk) > 512:
            raise ValueError("Invalid BLE chunk")
        if peer not in self.buffers and len(self.buffers) >= 3:
            raise ValueError("Too many setup connections")
        buffer = self.buffers.setdefault(peer, bytearray())
        buffer.extend(chunk)
        if len(buffer) > 2048:
            self.buffers.pop(peer, None)
            raise ValueError("Setup request too large")
        if not buffer.endswith(b"\n"):
            return None
        raw = bytes(buffer)
        self.buffers.pop(peer, None)
        try:
            data = json.loads(raw)
        except (ValueError, UnicodeError):
            raise ValueError("Invalid setup request")
        if not isinstance(data, dict):
            raise ValueError("Expected setup object")
        if not secrets.compare_digest(str(data.get("pin", "")), self.pin):
            self.attempts += 1
            raise ValueError("Setup PIN is incorrect")
        ssid = data.get("ssid")
        password = data.get("password")
        if (
            not isinstance(ssid, str)
            or not 1 <= len(ssid.encode("utf-8")) <= 32
            or "\x00" in ssid
        ):
            raise ValueError("SSID must be 1 to 32 UTF-8 bytes")
        if (
            not isinstance(password, str)
            or not 8 <= len(password) <= 63
            or "\x00" in password
        ):
            raise ValueError("WPA password must be 8 to 63 characters")
        self.busy = True
        self.authorized_peer = peer
        return ssid, password


async def proxy(bus, destination, path, interface):
    introspection = await bus.introspect(destination, path)
    return bus.get_proxy_object(destination, path, introspection).get_interface(
        interface
    )


async def connect_wifi(bus, ssid, password):
    from dbus_next import Variant

    nm = "org.freedesktop.NetworkManager"
    base = "/org/freedesktop/NetworkManager"
    manager = await proxy(bus, nm, base, nm)
    device = None
    previous = "/"
    for path in await manager.call_get_devices():
        props = await proxy(bus, nm, path, "org.freedesktop.DBus.Properties")
        if (await props.call_get(nm + ".Device", "DeviceType")).value == 2:
            device = path
            active = (await props.call_get(nm + ".Device", "ActiveConnection")).value
            if active != "/":
                ap = await proxy(bus, nm, active, "org.freedesktop.DBus.Properties")
                previous = (
                    await ap.call_get(nm + ".Connection.Active", "Connection")
                ).value
            break
    if not device:
        raise RuntimeError("No Wi-Fi adapter managed by NetworkManager")
    settings = {
        "connection": {
            "id": Variant("s", "Autolab Wi-Fi"),
            "type": Variant("s", "802-11-wireless"),
            "autoconnect": Variant("b", True),
        },
        "802-11-wireless": {
            "ssid": Variant("ay", ssid.encode()),
            "mode": Variant("s", "infrastructure"),
            "security": Variant("s", "802-11-wireless-security"),
        },
        "802-11-wireless-security": {
            "key-mgmt": Variant("s", "wpa-psk"),
            "psk": Variant("s", password),
        },
        "ipv4": {"method": Variant("s", "auto")},
        "ipv6": {"method": Variant("s", "auto")},
    }
    connection, active = await manager.call_add_and_activate_connection(
        settings, device, "/"
    )
    try:
        props = await proxy(bus, nm, active, "org.freedesktop.DBus.Properties")
        for _ in range(45):
            state = (await props.call_get(nm + ".Connection.Active", "State")).value
            if state == 2:
                return
            if state == 4:
                raise RuntimeError("Wi-Fi activation failed")
            await asyncio.sleep(1)
        raise RuntimeError("Wi-Fi activation timed out")
    except Exception:
        try:
            saved = await proxy(bus, nm, connection, nm + ".Settings.Connection")
            await saved.call_delete()
            if previous != "/":
                await manager.call_activate_connection(previous, device, "/")
        except Exception:
            pass
        raise


async def run(args):
    from dbus_next import BusType, DBusError, PropertyAccess, Variant
    from dbus_next.aio import MessageBus
    from dbus_next.service import ServiceInterface, method, dbus_property

    creds = json.loads(Path(args.credentials).expanduser().read_text())
    session = ProvisioningSession(
        creds["device_id"], f"{secrets.randbelow(1000000):06d}"
    )
    bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
    tasks = set()

    async def provision(ssid, password):
        try:
            session.status = {"state": "connecting", "device_id": session.device_id}
            await connect_wifi(bus, ssid, password)
            session.status = {"state": "wifi_connected", "device_id": session.device_id}
            base = (
                args.gateway.replace("wss://", "https://")
                .replace("ws://", "http://")
                .rstrip("/")
            )
            async with httpx.AsyncClient(timeout=20) as client:
                health = await client.get(base + "/health")
                health.raise_for_status()
                if health.json().get("mode") != args.mode:
                    raise RuntimeError("Gateway and Pi mode do not match")
                info = {}
                if args.mode == "cloud":
                    # Avoid racing the running agent's claim registration.
                    info_path = (
                        Path(args.credentials).expanduser().with_suffix(".setup.json")
                    )
                    for _ in range(40):
                        try:
                            info = json.loads(info_path.read_text())
                            valid = (
                                info.get("device_id") == session.device_id
                                and info.get("gateway") == args.gateway
                            )
                            if valid and (
                                info.get("claimed")
                                or time.time() - info.get("created_at", 0) < 540
                            ):
                                break
                        except (OSError, ValueError):
                            pass
                        await asyncio.sleep(1)
                    else:
                        raise RuntimeError(
                            "Start or restart the cloud camera agent to issue a current claim code"
                        )
            session.status = {
                "state": "gateway_connected",
                "device_id": session.device_id,
                "mode": args.mode,
                "claimed": bool(info.get("claimed")),
            }
            if info.get("code"):
                session.status["claim_code"] = info["code"]
            session.completed = True
        except Exception:
            # Never send subprocess output or network secrets to the browser/logs.
            session.status = {
                "state": "error",
                "device_id": session.device_id,
                "message": "Could not finish Wi-Fi or gateway setup. Check credentials, gateway mode and reachability, then retry.",
            }
        finally:
            session.busy = False

    class Service(ServiceInterface):
        def __init__(self):
            super().__init__("org.bluez.GattService1")

        @dbus_property(access=PropertyAccess.READ)
        def UUID(self) -> "s":
            return SERVICE_UUID

        @dbus_property(access=PropertyAccess.READ)
        def Primary(self) -> "b":
            return True

    class Characteristic(ServiceInterface):
        def __init__(self, kind):
            super().__init__("org.bluez.GattCharacteristic1")
            self.kind = kind

        @dbus_property(access=PropertyAccess.READ)
        def UUID(self) -> "s":
            return COMMAND_UUID if self.kind == "command" else STATUS_UUID

        @dbus_property(access=PropertyAccess.READ)
        def Service(self) -> "o":
            return ROOT + "/service"

        @dbus_property(access=PropertyAccess.READ)
        def Flags(self) -> "as":
            return (
                ["write", "encrypt-write"]
                if self.kind == "command"
                else ["read", "encrypt-read"]
            )

        @method()
        def ReadValue(self, options: "a{sv}") -> "ay":
            if self.kind != "status":
                raise DBusError(
                    "org.bluez.Error.NotPermitted", "Write-only characteristic"
                )
            data = dict(session.status)
            peer = options.get("device", Variant("o", "/")).value
            if peer != session.authorized_peer:
                data.pop("claim_code", None)
            value = json.dumps(data).encode()
            return value[options.get("offset", Variant("q", 0)).value :]

        @method()
        def WriteValue(self, value: "ay", options: "a{sv}"):
            if self.kind != "command":
                raise DBusError(
                    "org.bluez.Error.NotPermitted", "Read-only characteristic"
                )
            if options.get("offset", Variant("q", 0)).value:
                raise DBusError(
                    "org.bluez.Error.InvalidOffset", "Use sequential chunks"
                )
            peer = options.get("device", Variant("o", "/")).value
            try:
                result = session.receive(peer, bytes(value))
            except ValueError as exc:
                raise DBusError("org.bluez.Error.Failed", str(exc))
            if result:
                task = asyncio.create_task(provision(*result))
                tasks.add(task)
                task.add_done_callback(tasks.discard)

    service = Service()
    command = Characteristic("command")
    status = Characteristic("status")

    class Application(ServiceInterface):
        def __init__(self):
            super().__init__("org.freedesktop.DBus.ObjectManager")

        @method()
        def GetManagedObjects(self) -> "a{oa{sa{sv}}}":
            return {
                ROOT + "/service": {
                    "org.bluez.GattService1": {
                        "UUID": Variant("s", SERVICE_UUID),
                        "Primary": Variant("b", True),
                    }
                },
                **{
                    ROOT + "/service/" + kind: {
                        "org.bluez.GattCharacteristic1": {
                            "UUID": Variant(
                                "s", COMMAND_UUID if kind == "command" else STATUS_UUID
                            ),
                            "Service": Variant("o", ROOT + "/service"),
                            "Flags": Variant(
                                "as",
                                ["write", "encrypt-write"]
                                if kind == "command"
                                else ["read", "encrypt-read"],
                            ),
                        }
                    }
                    for kind in ("command", "status")
                },
            }

    class Advertisement(ServiceInterface):
        def __init__(self):
            super().__init__("org.bluez.LEAdvertisement1")

        @dbus_property(access=PropertyAccess.READ)
        def Type(self) -> "s":
            return "peripheral"

        @dbus_property(access=PropertyAccess.READ)
        def ServiceUUIDs(self) -> "as":
            return [SERVICE_UUID]

        @dbus_property(access=PropertyAccess.READ)
        def LocalName(self) -> "s":
            return "Autolab-" + creds["device_id"][:4]

        @method()
        def Release(self):
            pass

    class Agent(ServiceInterface):
        def __init__(self):
            super().__init__("org.bluez.Agent1")

        @method()
        def Release(self):
            pass

        @method()
        def RequestAuthorization(self, device: "o"):
            if time.monotonic() > session.deadline:
                raise DBusError("org.bluez.Error.Rejected", "Setup expired")

        @method()
        def AuthorizeService(self, device: "o", uuid: "s"):
            if uuid.lower() != SERVICE_UUID:
                raise DBusError(
                    "org.bluez.Error.Rejected", "Only Autolab setup is allowed"
                )

        @method()
        def Cancel(self):
            pass

    adapter = args.adapter
    props = await proxy(bus, "org.bluez", adapter, "org.freedesktop.DBus.Properties")
    previous_power = (await props.call_get("org.bluez.Adapter1", "Powered")).value
    previous_pairable = (await props.call_get("org.bluez.Adapter1", "Pairable")).value
    await props.call_set("org.bluez.Adapter1", "Powered", Variant("b", True))
    await props.call_set("org.bluez.Adapter1", "Pairable", Variant("b", True))
    for path, obj in [
        (ROOT, Application()),
        (ROOT + "/service", service),
        (ROOT + "/service/command", command),
        (ROOT + "/service/status", status),
        (ROOT + "/advertisement", Advertisement()),
        (ROOT + "/agent", Agent()),
    ]:
        bus.export(path, obj)
    gatt = await proxy(bus, "org.bluez", adapter, "org.bluez.GattManager1")
    advertising = await proxy(
        bus, "org.bluez", adapter, "org.bluez.LEAdvertisingManager1"
    )
    agents = await proxy(bus, "org.bluez", "/org/bluez", "org.bluez.AgentManager1")
    try:
        await agents.call_register_agent(ROOT + "/agent", "NoInputNoOutput")
        await agents.call_request_default_agent(ROOT + "/agent")
        await gatt.call_register_application(ROOT, {})
        await advertising.call_register_advertisement(ROOT + "/advertisement", {})
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
        for cleanup in [
            lambda: advertising.call_unregister_advertisement(ROOT + "/advertisement"),
            lambda: gatt.call_unregister_application(ROOT),
            lambda: agents.call_unregister_agent(ROOT + "/agent"),
            lambda: props.call_set(
                "org.bluez.Adapter1", "Pairable", Variant("b", previous_pairable)
            ),
        ]:
            try:
                await cleanup()
            except Exception:
                pass
        if not previous_power:
            try:
                await props.call_set(
                    "org.bluez.Adapter1", "Powered", Variant("b", False)
                )
            except Exception:
                pass
        bus.disconnect()


if __name__ == "__main__":
    load_dotenv()
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--gateway", default=os.getenv("AUTOLAB_GATEWAY", ""))
    p.add_argument(
        "--mode", choices=["demo", "cloud"], default=os.getenv("AUTOLAB_MODE", "demo")
    )
    p.add_argument(
        "--credentials",
        default=os.getenv("AUTOLAB_CREDENTIALS", "~/.config/autolab/credentials.json"),
    )
    p.add_argument("--adapter", default="/org/bluez/hci0")
    args = p.parse_args()
    if not args.gateway.startswith("wss://"):
        p.error(
            "Set AUTOLAB_GATEWAY to your trusted wss:// gateway before provisioning"
        )
    if not Path(args.credentials).expanduser().is_file():
        p.error("Initialize device credentials using the normal agent first")
    try:
        asyncio.run(run(args))
    except KeyboardInterrupt:
        pass
