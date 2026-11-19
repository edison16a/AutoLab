"""Autolab fluidics controller for a Raspberry Pi Pico running MicroPython.

The modules avoid typing, dataclasses and enum so the same files run on the
Pico and under CPython in tests. Only hal.py touches hardware.
"""
