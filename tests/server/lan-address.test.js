const { test } = require("node:test");
const assert = require("node:assert/strict");
const { pickLanAddress } = require("../../lan-address");

const v4 = (address, internal = false) => ({ address, family: "IPv4", internal });

test("Wi-Fi address wins over a Tailscale-style VPN address listed first (v1.4.0 bug)", () => {
  const nets = { Tailscale: [v4("100.78.69.230")], "Wi-Fi": [v4("192.168.40.120")] };
  assert.equal(pickLanAddress(nets), "192.168.40.120");
});

test("private ranges in order: 192.168, then 10, then 172.16–31", () => {
  assert.equal(pickLanAddress({ a: [v4("172.20.1.5")], b: [v4("10.0.0.7")], c: [v4("192.168.1.2")] }), "192.168.1.2");
  assert.equal(pickLanAddress({ a: [v4("172.20.1.5")], b: [v4("10.0.0.7")] }), "10.0.0.7");
  assert.equal(pickLanAddress({ a: [v4("100.64.0.1")], b: [v4("172.31.0.9")] }), "172.31.0.9");
});

test("172.32 is not private; other addresses still beat VPN and link-local", () => {
  assert.equal(pickLanAddress({ a: [v4("100.100.1.1")], b: [v4("169.254.3.3")], c: [v4("172.32.0.1")] }), "172.32.0.1");
  assert.equal(pickLanAddress({ a: [v4("169.254.3.3")], b: [v4("100.100.1.1")] }), "100.100.1.1");
});

test("skips loopback and IPv6; null when nothing is left", () => {
  const nets = { lo: [v4("127.0.0.1", true)], eth: [{ address: "fe80::1", family: "IPv6", internal: false }] };
  assert.equal(pickLanAddress(nets), null);
  assert.equal(pickLanAddress({}), null);
  assert.equal(pickLanAddress({ eth: [{ address: "192.168.0.4", family: 4, internal: false }] }), "192.168.0.4");
});
