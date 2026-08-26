# Third-party model weights

## u2netp.onnx — U<sup>2</sup>-Netp (small variant of U<sup>2</sup>-Net)

Used by the Designs module's background remover (`src/lib/designs/bgRemove.ts`) to
produce the alpha mask. It runs entirely in the visitor's browser via
onnxruntime-web; no image is ever uploaded.

| | |
|---|---|
| **Model** | U<sup>2</sup>-Netp (salient object detection) |
| **Origin** | https://github.com/xuebinqin/U-2-Net |
| **Licence** | Apache License 2.0 — full text in `LICENSE-u2net-apache-2.0.txt` |
| **Paper** | Qin et al., *U<sup>2</sup>-Net: Going Deeper with Nested U-Structure for Salient Object Detection*, Pattern Recognition 106 (2020) |
| **This file** | the ONNX export published by [danielgatis/rembg](https://github.com/danielgatis/rembg) (MIT) as release asset `v0.0.0/u2netp.onnx` |
| **Size** | 4,574,861 bytes |
| **sha256** | `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8` |
| **Retrieved** | 26 August 2026 |

Apache-2.0 permits commercial use, modification and redistribution provided the
licence and attribution travel with the work — which is what this file and
`LICENSE-u2net-apache-2.0.txt` are for. Both are served publicly alongside the
weights; do not delete them.

### Why not one of the usual alternatives

* `@imgly/background-removal` is **AGPL-3.0** (see the `LICENSE.md` in its published
  tarball) with a paid commercial licence offered separately. Unusable in a
  closed-source SaaS.
* BriaAI **RMBG-1.4 / RMBG-2.0** are **CC BY-NC 4.0** — non-commercial. Unusable here.

## WebAssembly runtime

`onnxruntime-web` (MIT, Microsoft) is an npm dependency; its `.wasm` binary is emitted
from `node_modules` by the build, so it is not vendored here and stays locked to the
installed package version.
