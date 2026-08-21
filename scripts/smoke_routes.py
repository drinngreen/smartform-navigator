"""Smoke test delle rotte critiche.

Apre le pagine con un browser reale, restituisce exit code 1 se:
- la pagina resta bianca (nessun contenuto renderizzato)
- compare un errore runtime in console / error boundary

Uso: python3 scripts/smoke_routes.py [base_url]
"""

import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
SHOTS = Path("/tmp/browser/smoke")
SHOTS.mkdir(parents=True, exist_ok=True)

ROUTES = [
    "/",
    "/auth",
    "/mn/auth",
    "/mn/admin/dev-multyproget",
    "/mn/admin/dev-multyproget/rentri-console",
]

IGNORE = (
    "Function components cannot be given refs",
    "Download the React DevTools",
    "Failed to load resource",
    "net::ERR_",
    "[Auth]",
)


async def check(page, route):
    errors = []

    def on_console(msg):
        if msg.type == "error" and not any(k in msg.text for k in IGNORE):
            errors.append(msg.text[:300])

    def on_pageerror(err):
        errors.append(f"pageerror: {str(err)[:300]}")

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)

    await page.goto(f"{BASE}{route}", wait_until="domcontentloaded")
    await page.wait_for_timeout(3500)

    body = (await page.inner_text("body")).strip()
    await page.screenshot(path=str(SHOTS / (route.strip("/").replace("/", "_") or "root") ) + ".png")

    page.remove_listener("console", on_console)
    page.remove_listener("pageerror", on_pageerror)

    if len(body) < 20:
        errors.append("pagina vuota (nessun contenuto renderizzato)")
    if "Qualcosa è andato storto" in body or "Something went wrong" in body:
        errors.append("error boundary attivo")
    return errors


async def main():
    failures = {}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        for route in ROUTES:
            errs = await check(page, route)
            status = "OK " if not errs else "FAIL"
            print(f"[{status}] {route}")
            for e in errs:
                print(f"        - {e}")
            if errs:
                failures[route] = errs
        await browser.close()

    print(f"\n{len(ROUTES) - len(failures)}/{len(ROUTES)} rotte OK")
    sys.exit(1 if failures else 0)


asyncio.run(main())
