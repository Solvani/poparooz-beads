# Poparooz E05 Actual-Production Evidence Summary

- Stage: P3-A03-E05-PRE
- Production HEAD: 23c0cef3644de26ff7c1d923394a64b7efb2743c
- Corpus manifest SHA-256: 94b3a88a77ebd969bae9be3a2971c84a32eaf38c7e6779bc1e0e317b1f15fc9e
- Production runs: 54
- Profiles: 24 / 48 / 72 / 120 / 168 / 221
- Hard gates: 756 passed / 0 failed
- Canonical evidence SHA-256: 1357999cf5eb9585da9315d5325f01131ea818383eb7dd9f86d12aea3ebdf1b8

This summary contains deterministic measurements only. It defines no Recommendation Policy.

## Required Bead Set Distribution

| Required profile | Runs |
| ---------------: | ---: |
|               24 |    0 |
|               48 |    0 |
|               72 |    0 |
|              120 |    0 |
|              168 |   13 |
|              221 |   41 |

## Whole-Corpus Profile Measurements

| Profile | Runs | Mean run mean dE00 | Median run mean dE00 | P95 of run mean dE00 |  Mean run P95 dE00 | Worst run P95 dE00 | Worst maximum dE00 |   Mean used colors | Min used | Max used |
| ------: | ---: | -----------------: | -------------------: | -------------------: | -----------------: | -----------------: | -----------------: | -----------------: | -------: | -------: |
|      24 |   54 |  7.420961365024591 |    7.382127733462147 |   15.416901606376893 | 14.335793213826992 | 24.087990718493362 | 26.298206520941317 |  7.074074074074074 |        1 |       13 |
|      48 |   54 |  6.674517281919488 |   6.8975303951629545 |   12.774218864618877 | 12.897899474748174 | 21.152403903010466 | 23.420271931437295 |   8.37037037037037 |        1 |       15 |
|      72 |   54 |  6.556696183176206 |     6.80778019046106 |   12.500408151374797 | 12.599494767963742 | 21.152403903010466 | 23.420271931437295 |  9.462962962962964 |        1 |       17 |
|     120 |   54 |  5.441905135342769 |    5.893426211842699 |   10.187043253778732 | 10.213447521311847 |  17.89392197944515 |  17.89392197944515 |  11.62962962962963 |        2 |       19 |
|     168 |   54 | 4.4960981727441025 |    4.495915740882856 |    9.351416406722446 |  9.175286078770055 | 15.729907489248165 | 16.285083813926395 | 12.574074074074074 |        3 |       22 |
|     221 |   54 |   4.07347000463184 |   4.0680804306460825 |    7.102316839267854 |  8.451648857588369 | 13.879324211650369 | 15.187637693364145 |  13.88888888888889 |        3 |       22 |

## Whole-Corpus Adjacent Profile Transitions

Positive dE00 improvement means the larger profile reduced error. Used-color change is larger minus smaller.

| Transition | Runs | Mean dE00 improvement | P95 dE00 improvement | Maximum dE00 improvement |  Used-color change |
| ---------- | ---: | --------------------: | -------------------: | -----------------------: | -----------------: |
| 24 -> 48   |   54 |    0.7464440831051049 |   1.4378937390788222 |       2.1966909697315105 | 1.2962962962962963 |
| 48 -> 72   |   54 |   0.11782109874328349 |  0.29840470678443104 |       0.5103435052015823 | 1.0925925925925926 |
| 72 -> 120  |   54 |    1.1147910478334329 |   2.3860472466518936 |       2.2819573770723913 | 2.1666666666666665 |
| 120 -> 168 |   54 |    0.9458069625986711 |   1.0381614425417904 |       0.8320672341277892 | 0.9444444444444444 |
| 168 -> 221 |   54 |   0.42262816811226106 |   0.7236372211816885 |       0.6619253556716606 | 1.3148148148148149 |

## Trusted Pairs

- golden-retriever-pair: 4 production runs; source pairs/golden-retriever-opaque.png; trusted reference pairs/golden-retriever-transparent.png.
- pale-teddy-bear-pair: 4 production runs; source pairs/teddy-bear-opaque.png; trusted reference pairs/teddy-bear-transparent.png.
- poparooz-logo-pair: 4 production runs; source pairs/poparooz-logo-opaque.png; trusted reference pairs/poparooz-logo-transparent.png.
- portrait-sweater-pair: 4 production runs; source pairs/portrait-sweater-opaque.png; trusted reference pairs/portrait-sweater-transparent.png.
- white-pump-bottle-pair: 4 production runs; source pairs/pump-bottle-opaque.png; trusted reference pairs/pump-bottle-transparent.png.

Trusted references remain occupancy references and are not additional production runs.
