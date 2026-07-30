# P1-A10 Performance Benchmark Evidence

Generated (UTC): **2026-07-30T03:24:29.480Z**

Project base commit: `18e7c9c271d3f4d5f7afed45e4cf395c63e2da9e`

Benchmark scope: **P1-A10 working tree; pure computation only**

## Environment

- OS: win32 10.0.19045
- Architecture: x64
- CPU: Intel(R) Core(TM) i7-10700F CPU @ 2.90GHz
- Logical cores: 16
- Total memory: 16251.61 MiB
- Node: v24.14.0
- Build mode: Vite SSR benchmark bundle executed in Node
- Warm-up iterations: 3
- Measurement iterations: 10

No user name, local path, device serial, IP, file name, or image content is recorded.

## Method

Fixtures are generated deterministically in memory and are synthetic/not-production. Each operation is warmed up, then all measurement samples are retained. Median, min, max, and nearest-rank p95 are reported without an SLA threshold. Quantization is measured as a whole; Histogram, Median Cut, Medoid, and remapping are not duplicated or separately instrumented.

Node measurements exclude browser decoding, Canvas extraction, real Worker scheduling, structured-clone/detachment timing, rendering, and customer interaction. Pure computation end-to-end means only `quantizeImage -> assemblePattern -> toPublicPatternResult`.

## Timing results

| Stage                       | Scenario          | Parameters                                    | Median ms | Min ms | P95 ms | Max ms | Approx peak heap delta MiB |
| --------------------------- | ----------------- | --------------------------------------------- | --------: | -----: | -----: | -----: | -------------------------: |
| RGB to Lab                  | 8 unique colors   | U=8                                           |      0.02 |   0.02 |   0.05 |   0.05 |                       0.11 |
| RGB to Lab                  | 16 unique colors  | U=16                                          |      0.03 |   0.03 |   0.07 |   0.07 |                       1.20 |
| RGB to Lab                  | 32 unique colors  | U=32                                          |      0.06 |   0.05 |   1.11 |   1.11 |                       0.17 |
| RGB to Lab                  | 64 unique colors  | U=64                                          |      0.07 |   0.06 |   0.11 |   0.11 |                       0.62 |
| RGB to Lab                  | 128 unique colors | U=128                                         |      0.13 |   0.12 |   0.14 |   0.14 |                       2.40 |
| RGB to Lab                  | 256 unique colors | U=256                                         |      0.23 |   0.21 |   0.44 |   0.44 |                       4.71 |
| Quantization                | Small             | 29x29; U=8; K=8; P=32; solid-blocks           |      0.21 |   0.18 |   2.87 |   2.87 |                       1.26 |
| Palette matching            | Small             | 29x29; U=8; K=8; P=32; solid-blocks           |      2.44 |   2.31 |   4.01 |   4.01 |                       3.59 |
| Pattern assembly            | Small             | 29x29; U=8; K=8; P=32; solid-blocks           |      3.33 |   3.08 |   4.12 |   4.12 |                      11.71 |
| Public mapping              | Small             | 29x29; U=8; K=8; P=32; solid-blocks           |      0.46 |   0.34 |   0.57 |   0.57 |                       2.11 |
| Pure computation end-to-end | Small             | 29x29; U=8; K=8; P=32; solid-blocks           |      3.08 |   2.93 |   3.96 |   3.96 |                      12.39 |
| Quantization                | Medium            | 58x58; U=64; K=16; P=64; horizontal-gradient  |      0.51 |   0.47 |   0.87 |   0.87 |                       4.40 |
| Palette matching            | Medium            | 58x58; U=64; K=16; P=64; horizontal-gradient  |      7.91 |   7.67 |   8.31 |   8.31 |                       7.11 |
| Pattern assembly            | Medium            | 58x58; U=64; K=16; P=64; horizontal-gradient  |      8.76 |   8.31 |  10.28 |  10.28 |                       1.68 |
| Public mapping              | Medium            | 58x58; U=64; K=16; P=64; horizontal-gradient  |      0.31 |   0.31 |   0.38 |   0.38 |                       4.60 |
| Pure computation end-to-end | Medium            | 58x58; U=64; K=16; P=64; horizontal-gradient  |      9.08 |   8.65 |   9.79 |   9.79 |                       0.00 |
| Quantization                | Large             | 116x116; U=128; K=32; P=128; checker          |      1.05 |   1.02 |   1.40 |   1.40 |                       6.61 |
| Palette matching            | Large             | 116x116; U=128; K=32; P=128; checker          |     29.80 |  28.82 |  40.99 |  40.99 |                       0.00 |
| Pattern assembly            | Large             | 116x116; U=128; K=32; P=128; checker          |     31.60 |  31.34 |  36.31 |  36.31 |                      30.51 |
| Public mapping              | Large             | 116x116; U=128; K=32; P=128; checker          |      0.67 |   0.67 |   1.09 |   1.09 |                      10.51 |
| Pure computation end-to-end | Large             | 116x116; U=128; K=32; P=128; checker          |     32.52 |  32.24 |  34.75 |  34.75 |                      10.97 |
| Quantization                | Stress            | 232x232; U=256; K=64; P=256; transparent-edge |      3.42 |   2.99 |   7.53 |   7.53 |                      19.60 |
| Palette matching            | Stress            | 232x232; U=256; K=64; P=256; transparent-edge |    121.97 | 115.78 | 148.42 | 148.42 |                      10.66 |
| Pattern assembly            | Stress            | 232x232; U=256; K=64; P=256; transparent-edge |    122.46 | 120.48 | 134.01 | 134.01 |                      10.72 |
| Public mapping              | Stress            | 232x232; U=256; K=64; P=256; transparent-edge |      1.30 |   1.28 |   1.85 |   1.85 |                      13.05 |
| Pure computation end-to-end | Stress            | 232x232; U=256; K=64; P=256; transparent-edge |    126.71 | 124.25 | 144.66 | 144.66 |                      34.26 |

## Buffer observations

| Scenario | Input RGBA bytes | Quantized indices bytes | Internal pattern bytes | Public matrix bytes |
| -------- | ---------------: | ----------------------: | ---------------------: | ------------------: |
| Small    |             3364 |                    1682 |                   1682 |                1682 |
| Medium   |            13456 |                    6728 |                   6728 |                6728 |
| Large    |            53824 |                   26912 |                  26912 |               26912 |
| Stress   |           215296 |                  107648 |                 107648 |              107648 |

Each index buffer size is reported independently. Equal sizes do not imply shared ownership; automated integration tests verify distinct buffers.

## Memory limitations

Heap readings use `process.memoryUsage().heapUsed` before, during, and after each measurement group. Garbage collection is not forced and the observed delta is only an approximation. It is not a browser peak, leak proof, Safari iOS result, or mobile memory commitment.

## Interpretation boundary

These measurements support growth-trend and relative-stage review only. The Phase 1 freeze document records the final Green/Yellow/Red classification and Worker Decision after comparing the measured stages. Real browser and device validation remains separate evidence.
