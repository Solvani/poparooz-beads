# A06 Email Gate Editorial Atelier Visual QA

Stage: `P3-A03-E04-A06-A02`

Final result: **USER VISUAL APPROVAL PASSED / READY FOR FRONTEND FREEZE**

## Real-browser evidence

The current A06 candidate was rendered in local Google Chrome through a
repository-external deterministic harness. The harness imported the actual
`EmailGateDialog.tsx`, `email-gate.css`, Poparooz Logo, and approved floral
WebP. It did not substitute static HTML, a design board, Figma, or a fabricated
screenshot for the candidate UI.

Validated viewports:

- Desktop: 1440 x 1000 and 1440 x 800.
- Mobile: 390 x 844 and 375 x 667.

The final correction evidence is stored outside the repository under:

```text
D:\CodexData\.codex\visualizations\2026\08\27\01a0426b-4166-7a10-9e97-e12ba86e3dbd\A06-A02-CORRECTION-01\
```

## Accepted result

- The V1 Email-input focus defect is closed. Keyboard focus has a visible
  Poparooz deep-green `:focus-visible` ring, including while the invalid field
  retains its red error border and error text.
- The V1 status-semantic defect is closed. Issuing and Verifying use a calm
  progress treatment, Success uses a positive treatment, true failures retain
  danger treatment, and the persistence warning remains distinct.
- Desktop visual approval: yes.
- Mobile visual approval: yes.
- No horizontal overflow was found in the validated viewports.
- No required controls were clipped.
- Focus entry, Tab and Shift+Tab containment, Escape close, opener focus
  restoration, and reopen focus were browser-tested.
- The real Poparooz Logo and approved floral WebP loaded successfully.
- Browser inspection found no runtime console error or warning attributable to
  the candidate.
- Network inspection found no real Email Gate API, Turnstile, Resend, Worker,
  D1, or email request. All verification data was deterministic and local.

The user explicitly accepted the following V2 observations without further
correction:

- desktop floral supporting-copy contrast;
- invalid OTP slots retaining the existing focus-green treatment.

No further source or UI correction is authorized by this approval.

## Production and environment qualifications

- Production continues to inject `UNAVAILABLE_EMAIL_GATE_CAPABILITY`.
- The current customer Download remains ungated.
- No Worker was deployed, D1 was mutated, Turnstile was activated, real email
  was sent, Shopify protocol was changed, or manual deployment was performed.
- Physical-device testing, Safari/WebKit testing, screen-reader testing, forced
  colors, browser zoom, and real assistive-technology validation were not
  performed and remain explicit qualifications rather than inferred passes.
