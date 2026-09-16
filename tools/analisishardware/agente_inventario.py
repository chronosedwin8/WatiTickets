#!/usr/bin/env python3
"""
Agente de inventario de TicketWati.

Recopila la ficha técnica del equipo donde se ejecuta y la envía a la API
de TicketWati, que la registra o actualiza en el inventario de activos.

Configuración
-------------
No hay nada codificado en este archivo. Los datos se leen, por orden de
prioridad, de:

  1. Variables de entorno:
       TICKETWATI_URL        http://servidor:4000
       TICKETWATI_AGENT_KEY  clave de integración

  2. Un archivo `agente.ini` junto a este script:

       [ticketwati]
       url = http://servidor:4000
       clave = la-clave-del-agente

Uso
---
    python agente_inventario.py             # recopila y envía
    python agente_inventario.py --probar    # sólo muestra, no envía
    python agente_inventario.py --guardar   # guarda el informe en JSON

Programación diaria (Windows):
    schtasks /create /tn "Inventario TicketWati" /tr "python C:\\ruta\\agente_inventario.py" /sc daily /st 09:00 /ru SYSTEM
"""
from __future__ import annotations

import argparse
import configparser
import ctypes
import datetime as dt
import json
import logging
import os
import platform
import re
import socket
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

try:
    import psutil
except ImportError:
    print("Falta la dependencia 'psutil'. Instálala con:  pip install psutil")
    sys.exit(1)

# WMI y registro sólo existen en Windows.
try:
    import winreg

    import wmi  # type: ignore
except ImportError:
    wmi = None
    winreg = None

AQUI = Path(__file__).resolve().parent

# Las consolas de Windows suelen usar cp1252 y rompen con acentos.
# Se fuerza UTF-8 en la salida para que los mensajes se lean bien siempre.
for flujo in (sys.stdout, sys.stderr):
    try:
        flujo.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except Exception:
        pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(AQUI / "agente_inventario.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("inventario")


# ─────────────────────────────── Configuración
class Config:
    """Lee la configuración del entorno o del archivo .ini."""

    def __init__(self) -> None:
        ini = configparser.ConfigParser()
        ruta_ini = AQUI / "agente.ini"
        if ruta_ini.exists():
            ini.read(ruta_ini, encoding="utf-8")

        def leer(clave_env: str, clave_ini: str) -> str:
            valor = os.environ.get(clave_env, "").strip()
            if valor:
                return valor
            if ini.has_option("ticketwati", clave_ini):
                return ini.get("ticketwati", clave_ini).strip()
            return ""

        self.url = leer("TICKETWATI_URL", "url").rstrip("/")
        self.clave = leer("TICKETWATI_AGENT_KEY", "clave")
        self.tiempo_espera = int(leer("TICKETWATI_TIMEOUT", "timeout") or 30)

    @property
    def completa(self) -> bool:
        return bool(self.url and self.clave)

    def explicar_falta(self) -> str:
        faltan = []
        if not self.url:
            faltan.append("la dirección del servidor (TICKETWATI_URL)")
        if not self.clave:
            faltan.append("la clave del agente (TICKETWATI_AGENT_KEY)")
        return (
            f"Falta {' y '.join(faltan)}.\n"
            f"Defínelas como variables de entorno o créalas en {AQUI / 'agente.ini'}:\n\n"
            "  [ticketwati]\n"
            "  url = http://servidor:4000\n"
            "  clave = la-clave-que-te-dio-el-administrador\n"
        )


# ─────────────────────────────── Utilidades
def es_administrador() -> bool:
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())  # type: ignore[attr-defined]
    except Exception:
        return False


def bytes_legibles(num: Any) -> str:
    try:
        valor = float(num)
    except (TypeError, ValueError):
        return "N/D"
    for unidad in ("B", "KB", "MB", "GB", "TB"):
        if valor < 1024:
            return f"{valor:.2f} {unidad}"
        valor /= 1024
    return f"{valor:.2f} PB"


def ejecutar_oculto(cmd: list[str]) -> str:
    """Ejecuta un comando sin abrir ventana y devuelve su salida."""
    kwargs: dict[str, Any] = {"stderr": subprocess.STDOUT}
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
    try:
        return subprocess.check_output(cmd, **kwargs).decode(errors="ignore")
    except Exception as e:
        log.debug("Falló el comando %s: %s", cmd[0], e)
        return ""


def seguro(fn, defecto=None):
    """Ejecuta una función de recolección sin que un fallo detenga el resto."""
    try:
        return fn()
    except Exception as e:
        log.debug("No se pudo recopilar un dato: %s", e)
        return defecto


def wmi_cliente():
    return wmi.WMI() if wmi else None


# ─────────────────────────────── Recolección
def datos_equipo() -> dict[str, Any]:
    log.info("  Identificación del equipo")

    datos: dict[str, Any] = {
        "device_name": socket.gethostname(),
        "domain": "WORKGROUP",
        "private_ip": seguro(lambda: socket.gethostbyname(socket.gethostname()), "N/D"),
        "last_logged_user": "N/D",
        "last_reboot": dt.datetime.fromtimestamp(psutil.boot_time()).isoformat(),
        "manufacturer": None,
        "model": None,
        "serial_number": None,
    }

    c = wmi_cliente()
    if c:
        for cs in seguro(lambda: c.Win32_ComputerSystem(), []) or []:
            if cs.UserName:
                datos["last_logged_user"] = cs.UserName
            datos["domain"] = cs.Domain or datos["domain"]
            datos["manufacturer"] = cs.Manufacturer
            datos["model"] = cs.Model

        # Número de serie: primero la BIOS, luego el producto.
        for bios in seguro(lambda: c.Win32_BIOS(), []) or []:
            if bios.SerialNumber:
                datos["serial_number"] = bios.SerialNumber.strip()

        serie = datos["serial_number"] or ""
        if not serie or re.match(r"^(default|to be filled|system serial)", serie, re.I):
            for prod in seguro(lambda: c.Win32_ComputerSystemProduct(), []) or []:
                if prod.IdentifyingNumber:
                    datos["serial_number"] = prod.IdentifyingNumber.strip()

    # Si WMI no dio usuario, se intenta el registro y luego la sesión actual.
    if datos["last_logged_user"] == "N/D" and winreg:
        def del_registro() -> str | None:
            clave = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\LogonUI",
            )
            try:
                valor, _ = winreg.QueryValueEx(clave, "LastLoggedOnUser")
                return valor
            finally:
                winreg.CloseKey(clave)

        usuario = seguro(del_registro)
        if usuario:
            datos["last_logged_user"] = usuario

    if datos["last_logged_user"] == "N/D":
        datos["last_logged_user"] = seguro(os.getlogin, "N/D")

    return datos


def datos_cpu() -> dict[str, Any]:
    info = {
        "name": platform.processor(),
        "arch": platform.machine(),
        "cores_physical": psutil.cpu_count(logical=False),
        "cores_logical": psutil.cpu_count(logical=True),
        "hz_advertised": "N/D",
    }
    c = wmi_cliente()
    if c:
        for p in seguro(lambda: c.Win32_Processor(), []) or []:
            info["name"] = p.Name
            info["hz_advertised"] = f"{p.MaxClockSpeed} MHz"
    return info


def datos_ram() -> dict[str, Any]:
    ram: dict[str, Any] = {
        "total_installed": bytes_legibles(psutil.virtual_memory().total),
        "modules": [],
    }
    c = wmi_cliente()
    if c:
        for m in seguro(lambda: c.Win32_PhysicalMemory(), []) or []:
            ram["modules"].append({
                "manufacturer": (m.Manufacturer or "").strip(),
                "capacity": bytes_legibles(m.Capacity),
                "speed": f"{m.Speed} MHz" if m.Speed else "N/D",
                "serial": (m.SerialNumber or "").strip(),
                "slot": m.DeviceLocator,
                "part_number": (m.PartNumber or "").strip(),
            })
    return ram


def datos_placa() -> dict[str, Any]:
    info = {"manufacturer": "N/D", "model": "N/D", "serial_number": "N/D"}
    c = wmi_cliente()
    if c:
        for b in seguro(lambda: c.Win32_BaseBoard(), []) or []:
            info["manufacturer"] = b.Manufacturer
            info["model"] = b.Product
            info["serial_number"] = b.SerialNumber
    return info


def datos_discos() -> list[dict[str, Any]]:
    discos: list[dict[str, Any]] = []
    c = wmi_cliente()
    if c:
        for d in seguro(lambda: c.Win32_DiskDrive(), []) or []:
            discos.append({
                "model": d.Model,
                "serial": (d.SerialNumber or "").strip(),
                "interface": d.InterfaceType,
                "size": bytes_legibles(d.Size),
                "partitions": [],
            })

    if not discos:
        discos.append({"model": "Genérico", "partitions": []})

    for part in seguro(psutil.disk_partitions, []) or []:
        uso = seguro(lambda: psutil.disk_usage(part.mountpoint))
        if not uso:
            continue
        discos[0]["partitions"].append({
            "drive": part.device,
            "filesystem": part.fstype,
            "size": bytes_legibles(uso.total),
            "free": bytes_legibles(uso.free),
            "used_percent": round(uso.percent, 1),
        })

    return discos


def datos_red() -> dict[str, Any]:
    info: dict[str, Any] = {"adapters": []}
    c = wmi_cliente()
    if c:
        adaptadores = seguro(lambda: c.Win32_NetworkAdapterConfiguration(IPEnabled=True), []) or []
        for n in adaptadores:
            info["adapters"].append({
                "description": n.Description,
                "mac_address": n.MACAddress,
                "ip_address": list(n.IPAddress) if n.IPAddress else [],
                "dhcp_enabled": n.DHCPEnabled,
            })
    return info


def datos_perifericos() -> dict[str, Any]:
    monitores, impresoras, usb = [], [], []
    c = wmi_cliente()
    if c:
        for m in seguro(lambda: c.Win32_DesktopMonitor(), []) or []:
            monitores.append({"name": m.Name, "status": m.Status})
        for p in seguro(lambda: c.Win32_Printer(), []) or []:
            impresoras.append({"name": p.Name, "default": p.Default})
        for d in seguro(lambda: c.Win32_PnPEntity(), []) or []:
            if "USB" in (d.PNPClass or ""):
                usb.append({"name": d.Name, "manufacturer": d.Manufacturer})
    return {"monitors": monitores, "printers": impresoras, "usb_devices": usb}


def datos_sistema() -> dict[str, Any]:
    return {
        "os": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "architecture": platform.machine(),
    }


def software_instalado() -> list[dict[str, str]]:
    programas: list[dict[str, str]] = []
    if not winreg:
        return programas

    rutas = [
        r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
    ]

    vistos: set[str] = set()
    for ruta in rutas:
        try:
            clave = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, ruta)
        except OSError:
            continue

        try:
            total, _, _ = winreg.QueryInfoKey(clave)
            for i in range(total):
                try:
                    sub = winreg.OpenKey(clave, winreg.EnumKey(clave, i))
                    nombre = winreg.QueryValueEx(sub, "DisplayName")[0]
                    try:
                        version = winreg.QueryValueEx(sub, "DisplayVersion")[0]
                    except FileNotFoundError:
                        version = ""
                    if nombre and nombre not in vistos:
                        vistos.add(nombre)
                        programas.append({"name": nombre, "version": version})
                except OSError:
                    continue
        finally:
            winreg.CloseKey(clave)

    return sorted(programas, key=lambda x: x["name"].lower())


def versiones_controladores() -> dict[str, str]:
    controladores: dict[str, str] = {}
    c = wmi_cliente()
    if c:
        for d in seguro(lambda: c.Win32_PnPSignedDriver(), []) or []:
            nombre = d.DeviceName or ""
            if any(x in nombre for x in ("Video", "Graphics", "Network", "Audio")):
                controladores[nombre] = d.DriverVersion
    return controladores


def ultima_actualizacion() -> str:
    salida = ejecutar_oculto([
        "powershell", "-NoProfile", "-Command",
        "Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1",
    ])
    m = re.search(r"(\d+/\d+/\d+)", salida)
    return m.group(1) if m else "N/D"


def datos_licencia() -> dict[str, str]:
    info = {"key_last_5": "N/D", "status": "N/D"}
    salida = ejecutar_oculto(
        ["cscript", "//NoLogo", r"C:\Windows\System32\slmgr.vbs", "/dli"]
    )
    for linea in salida.splitlines():
        if "Partial Product Key" in linea:
            info["key_last_5"] = linea.split(":", 1)[1].strip()
        elif "License Status" in linea:
            info["status"] = linea.split(":", 1)[1].strip()
    return info


def datos_seguridad() -> dict[str, Any]:
    info: dict[str, Any] = {"tpm_present": False, "antivirus": "N/D", "firewall": "N/D"}

    salida_tpm = ejecutar_oculto(["powershell", "-NoProfile", "-Command", "Get-Tpm"])
    info["tpm_present"] = bool(re.search(r"TpmPresent\s*:\s*True", salida_tpm))

    if wmi:
        def antivirus():
            c = wmi.WMI(namespace="root/SecurityCenter2")
            nombres = [av.displayName for av in c.AntivirusProduct()]
            return ", ".join(nombres) if nombres else "N/D"

        info["antivirus"] = seguro(antivirus, "N/D")

    salida_fw = ejecutar_oculto(
        ["powershell", "-NoProfile", "-Command", "Get-NetFirewallProfile | Select-Object Name,Enabled"]
    )
    if salida_fw:
        info["firewall"] = "activo" if "True" in salida_fw else "inactivo"

    return info


def redes_wifi() -> list[dict[str, str]]:
    """Perfiles WiFi registrados. Sólo los nombres: nunca las contraseñas."""
    salida = ejecutar_oculto(["netsh", "wlan", "show", "profiles"])
    perfiles = []
    for linea in salida.splitlines():
        if "All User Profile" in linea or "Perfil de todos los usuarios" in linea:
            perfiles.append({"ssid": linea.split(":", 1)[1].strip()})
    return perfiles


def generar_informe() -> dict[str, Any]:
    log.info("Recopilando información del equipo…")

    if not es_administrador():
        log.warning(
            "  El agente no se ejecuta como administrador: "
            "algunos datos del sistema quedarán incompletos."
        )

    log.info("  Hardware")
    informe = {
        "device_info": datos_equipo(),
        "hardware": {
            "cpu": datos_cpu(),
            "ram": datos_ram(),
            "motherboard": datos_placa(),
            "disks": datos_discos(),
            "network_adapters": datos_red(),
            **datos_perifericos(),
        },
    }

    log.info("  Software y seguridad")
    informe["software"] = {
        "system": datos_sistema(),
        "installed_software": software_instalado(),
        "driver_versions": versiones_controladores(),
        "last_update": ultima_actualizacion(),
    }
    informe["licenses"] = datos_licencia()
    informe["security"] = datos_seguridad()
    informe["wifi_profiles"] = redes_wifi()
    informe["generated_at"] = dt.datetime.now().isoformat()

    return informe


# ─────────────────────────────── Envío
def enviar(informe: dict[str, Any], cfg: Config) -> bool:
    destino = f"{cfg.url}/api/v1/hardware/report"
    cuerpo = json.dumps(informe, ensure_ascii=False).encode("utf-8")

    peticion = urllib.request.Request(
        destino,
        data=cuerpo,
        method="POST",
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "X-Agent-Key": cfg.clave,
            "User-Agent": "TicketWati-Agente-Inventario/1.0",
        },
    )

    try:
        with urllib.request.urlopen(peticion, timeout=cfg.tiempo_espera) as respuesta:
            datos = json.loads(respuesta.read().decode("utf-8"))
            log.info("✓ %s", datos.get("message", "Inventario enviado."))
            activo = datos.get("data") or {}
            if activo.get("name"):
                log.info("  Equipo: %s  ·  serie: %s", activo.get("name"), activo.get("serial_number"))
            return True

    except urllib.error.HTTPError as e:
        detalle = e.read().decode("utf-8", errors="ignore")
        try:
            mensaje = json.loads(detalle).get("error", {}).get("message", detalle)
        except json.JSONDecodeError:
            mensaje = detalle

        if e.code == 401:
            log.error("La clave del agente no es válida. Pídele al administrador una nueva.")
        elif e.code == 403:
            log.error("La clave no tiene permiso para enviar inventario. %s", mensaje)
        else:
            log.error("El servidor rechazó el informe (HTTP %s): %s", e.code, mensaje)
        return False

    except urllib.error.URLError as e:
        log.error(
            "No se pudo conectar con %s (%s). "
            "Comprueba que el servidor esté encendido y que la dirección sea correcta.",
            cfg.url, e.reason,
        )
        return False


# ─────────────────────────────── Principal
def main() -> int:
    parser = argparse.ArgumentParser(
        description="Agente de inventario de TicketWati.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--probar", action="store_true",
                        help="Recopila y muestra un resumen sin enviar nada.")
    parser.add_argument("--guardar", action="store_true",
                        help="Guarda el informe completo en un archivo JSON.")
    args = parser.parse_args()

    informe = generar_informe()

    if args.guardar or args.probar:
        destino = AQUI / "informe_inventario.json"
        destino.write_text(
            json.dumps(informe, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        log.info("Informe guardado en %s", destino)

    if args.probar:
        d = informe["device_info"]
        h = informe["hardware"]
        separador = "-" * 44
        print(f"\n{separador}")
        print("  RESUMEN DEL EQUIPO")
        print(separador)
        print(f"  Equipo      {d['device_name']}")
        print(f"  Serie       {d['serial_number'] or 'no disponible'}")
        print(f"  Fabricante  {d['manufacturer'] or 'no disponible'} {d['model'] or ''}")
        print(f"  Procesador  {h['cpu']['name']}")
        print(f"  Memoria     {h['ram']['total_installed']}")
        print(f"  Discos      {len(h['disks'])}")
        print(f"  Sistema     {informe['software']['system']['os']} "
              f"{informe['software']['system']['release']}")
        print(f"  Programas   {len(informe['software']['installed_software'])} detectados")
        print(separador)
        print("\nModo prueba: no se envio nada al servidor.\n")
        return 0

    cfg = Config()
    if not cfg.completa:
        log.error("No se puede enviar el inventario.\n\n%s", cfg.explicar_falta())
        return 1

    log.info("Enviando a %s…", cfg.url)
    return 0 if enviar(informe, cfg) else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        log.info("Cancelado por el usuario.")
        sys.exit(130)
    except Exception as e:
        log.error("Error inesperado: %s", e, exc_info=True)
        sys.exit(1)
