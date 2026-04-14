# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This is the Mutable Instruments Eurorack firmware monorepo. Each top-level directory (except `stmlib`, `avrlib`, `avrlibx`, `tools`, the two `*_audio_bootloader` dirs, and `hardware_design/` subfolders) is one module (Plaits, Clouds, Rings, Braids, etc.). A module directory contains its firmware sources, a `makefile`, a `bootloader/` subproject, `resources/` (Python scripts that generate lookup tables into `resources.cc`/`resources.h`), `hardware_design/` (KiCad/Eagle schematics and PCBs), and usually a `test/` directory with a host-side test harness.

AVR-based projects (older modules like Braids, Edges, Grids, Shruthi-era code under `avrlib*`) are GPL3.0. STM32-based projects are MIT. The two library trees:

- `stmlib/` — shared code for all STM32 projects: DSP primitives, system HAL wrappers, drivers, linker scripts, third-party STM Std Periph / HAL drivers under `stmlib/third_party/STM`, the `resources_compiler.py` tool, JTAG/serial programming scripts.
- `avrlib/`, `avrlibx/` — equivalents for AVR projects.

## Build system

All STM32 module makefiles `include stmlib/makefile.inc`, which is the central build driver. A module `makefile` sets `F_CPU`, `F_CRYSTAL`, `FAMILY` (one of `f0xx`, `f10x`/default, `f37x`, `f4xx`, `f7xx`, `h7xx`, `g4xx`), `TARGET`, `PACKAGES` (list of source directories), `RESOURCES`, and optionally `BOOTLOADER`, `APPLICATION_LARGE=TRUE` / `APPLICATION_SMALL=TRUE` / `APPLICATION=TRUE` (these pick a linker script variant and flash base address), and `UPLOAD_COMMAND`.

The ARM toolchain path defaults to `/usr/local/arm/` (Plaits overrides to `/usr/local/arm-4.8.3/`). Override with `TOOLCHAIN_PATH=...`. Programming defaults to an ST-Link v2 via OpenOCD (`PGM_INTERFACE=stlink-v2`, scripts under `stmlib/programming/jtag/`, OpenOCD scripts expected at `/opt/local/share/openocd/scripts/`).

Always run `make` from the repo root, not inside a module. Example (from repo root):

```
make -f plaits/makefile             # default target: build hex
make -f plaits/makefile bin         # raw .bin
make -f plaits/makefile size        # flash/RAM usage, piped through figlet+cowsay
make -f plaits/makefile resources   # regenerate plaits/resources.cc from plaits/resources/*.py
make -f plaits/makefile upload      # dispatches to $(UPLOAD_COMMAND), usually a JTAG flash
make -f plaits/makefile wav         # (Plaits only) build firmware-update .wav via QPSK encoder
make -f plaits/makefile clean
```

Build artifacts go under `build/<TARGET>/`. Combined bootloader+app images (`*_bootloader_combo.hex/bin`) are produced when `BOOTLOADER` is set — the `upload_combo_*` targets flash them together. Upload variants: `upload_jtag`, `upload_jtag_erase_first`, `upload_combo_jtag*`, `upload_serial`, `image_jtag` (writes `.bin` only, no erase/reset), etc. — see the rules in `stmlib/makefile.inc`.

Every module has a `bootloader/` subproject with its own `makefile`; build it the same way (`make -f plaits/bootloader/makefile`). The app's combo-hex rule depends on the bootloader hex, so you must build the bootloader first when doing a combo flash.

## Resources

`resources.cc`/`resources.h` in each module are generated files — do not edit by hand. They are built from the Python scripts in `<module>/resources/` by `stmlib/tools/resources_compiler.py` (invoked via `make resources`). When you change a lookup table, wavetable, string table, or similar data, edit the Python generator and rerun `make resources`.

## Host-side tests

Some modules ship a host test harness under `<module>/test/` with its own `makefile` that compiles a subset of the DSP code with `g++ -DTEST -msse2` and links against libm — no ARM toolchain needed. These produce a native binary (e.g. `plaits_test`) that typically writes WAV files via `stmlib/test/wav_writer.h` for offline listening / bench-testing DSP changes. Run:

```
make -f plaits/test/makefile               # builds ./plaits_test
make -f plaits/test/makefile profile       # gperftools CPU profile → profile.pdf
```

The `-DTEST` define is how DSP code detects host builds (vs. embedded).

## Code architecture within a module

STM32 modules share a conventional shape. Using Plaits as the canonical example:

- `plaits.cc` — `main()`, IRQ handlers, audio-rate callback. Owns the real-time loop: reads ADCs, runs DSP, pushes to DAC/codec via DMA.
- `ui.cc/.h` — front-panel UI state machine (buttons, LEDs, pots, CV conditioning, calibration, settings menus).
- `settings.cc/.h` — persistent settings, stored in flash via `stmlib/system/storage.h`.
- `drivers/` — thin wrappers around STM32 peripherals specific to this module's hardware (codec, ADC mux, LED driver, etc.).
- `dsp/` — all audio DSP. Split into subfolders (e.g. `engine/`, `engine2/`, `fm/`, `fx/`, `physical_modelling/`, `speech/`, `chords/`, `drum_modelling/`). Each engine is a class with an `Init` + `Render` method and is invoked by a top-level `Voice`/dispatcher.
- `bootloader/` — audio- or serial-update bootloader, built from `stm_audio_bootloader/` (QPSK/FSK) + module-specific glue.

Shared conventions enforced across modules:

- No exceptions, no RTTI (`-fno-exceptions -fno-rtti`), short enums, `-Werror`, `-O2`.
- Memory is statically allocated. DSP objects are constructed once and reused; use `Init()` rather than constructors for heavy setup. A `BufferAllocator` pattern (see `stmlib/utils/buffer_allocator.h`) is used when several DSP objects need to share one static scratch buffer.
- Fixed frame sizes: engines render in power-of-two blocks (commonly 12, 16, or 24 samples) — check the containing `Voice`/`Process` method for the exact size before changing a render function.
- `stmlib/dsp/` provides the shared DSP building blocks (parameter interpolator, SVF, delay lines, FFT, cosine/sine LUTs). Prefer these over rolling new ones.
- `stmlib/system/` provides the OS-like primitives: `System` (clock init), `SysTick`, `Storage` (flash persistence), `Bootloader`, `Uid`, etc.

## When adding a new DSP engine or feature

1. Add sources under the appropriate `<module>/dsp/...` directory.
2. Add that directory to `PACKAGES` in the module's `makefile` (and in `test/makefile` if it needs host-side coverage).
3. If it introduces new lookup tables, add a generator in `<module>/resources/` and register it in the module's `resources/__init__.py` / `lookup_tables.py`, then `make resources`.
4. Rebuild bootloader + app combo if the new code needs to be flashed over an existing unit.
