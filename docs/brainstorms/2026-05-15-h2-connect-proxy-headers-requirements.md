---
date: 2026-05-15
topic: h2-connect-proxy-headers
---

# HTTP/2 CONNECT Proxy Headers

## Summary

Sub-Store will preserve Surge HTTP/2 CONNECT proxies as canonical `h2-connect` nodes and round-trip custom proxy request headers for the Surge proxy types that now support them. Egern HTTP/HTTPS output will also carry root `headers` fields, while unsupported targets must not silently drop headers.

---

## Problem Frame

Surge now supports custom request headers on HTTP, HTTPS, HTTP/2 CONNECT, and TrustTunnel proxy definitions, including dynamic placeholders such as `<random-string(n)>` and `<random-string(min-max)>`. Without parser and producer support, these nodes either fail to round-trip or lose headers during conversion. Egern documentation also lists `headers` for HTTP and HTTPS proxies, but current output does not emit it.

---

## Requirements

**Protocol Coverage**
- R1. Surge input must parse `h2-connect` proxy lines into type `h2-connect`.
- R2. Surge output must emit type `h2-connect` for canonical `h2-connect` nodes.
- R3. Frontend protocol filtering must expose HTTP/2 CONNECT and use value `h2-connect`.

**Header Handling**
- R4. Surge input and output must preserve root `headers` for HTTP, HTTPS, HTTP/2 CONNECT, and TrustTunnel proxies.
- R5. Header placeholder text such as `<random-string(16)>` and `<random-string(16-32)>` must round-trip as literal configuration text.
- R6. Egern HTTP and HTTPS output must include root `headers` when present.
- R7. Outputs that cannot represent root headers for HTTP/HTTPS, HTTP/2 CONNECT, or TrustTunnel must log and filter or error instead of silently dropping those headers.

**Compatibility**
- R8. Existing proxy types and transport-layer headers, such as WebSocket or VMess/VLESS h2 transport headers, must keep current behavior.
- R9. Mihomo support must be based on local source verification, not assumption.

---

## Acceptance Examples

- AE1. **Covers R1, R4, R5.** Given `Proxy = h2-connect, example.com, 443, headers=X-Padding:<random-string(16-32)>`, when Surge input is parsed, the node type is `h2-connect` and the header value remains unchanged.
- AE2. **Covers R2, R4.** Given a Surge HTTP, HTTPS, HTTP/2 CONNECT, or TrustTunnel node with root headers, when Surge output is generated, the line contains `headers=...`.
- AE3. **Covers R6.** Given an Egern HTTP or HTTPS node with root headers, when Egern output is generated, the YAML object includes `headers`.
- AE4. **Covers R7.** Given a TrustTunnel node with root headers, when outputting to a target without TrustTunnel header support, Sub-Store logs the unsupported header condition and omits or errors the node.

---

## Success Criteria

- Users can parse and re-export Surge HTTP/2 CONNECT and supported header-bearing Surge proxies without losing header configuration.
- Downstream implementation has explicit platform boundaries for header support and does not need to infer unsupported-target behavior.

---

## Scope Boundaries

- No frontend node editor for authoring headers is added in this pass.
- No runtime generation of `<random-string(...)>` values is implemented by Sub-Store; placeholders remain Surge configuration text.
- No claim that Mihomo supports HTTP/2 CONNECT as a standalone outbound type unless verified in `adapter/parser.go` and `constant/adapters.go`.

---

## Dependencies / Assumptions

- Egern HTTP/HTTPS `headers` support is based on the current Egern proxy configuration documentation.
- Local Mihomo source shows HTTP proxy `headers` support for the regular HTTP outbound, but no standalone `h2-connect` adapter type and no TrustTunnel `headers` option.
- sing-box HTTP outbound supports root `headers`, and JSON output preserves canonical proxy objects without platform-specific header loss.
