"""Autolab imaging gateway: one process that relays the Pi, browsers and the ML worker.

main.py at the service root stays as the uvicorn entry point (`uvicorn main:app`),
so the Dockerfile, compose and docs keep working while the code lives here.
"""
