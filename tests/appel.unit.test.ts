import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { identifiantsTurn, serveursIce, RegistreAppels, dureeLisible } from "../lib/appel";

describe("identifiants TURN (coturn use-auth-secret)", () => {
  it("username = expiration:userId et credential = HMAC-SHA1 base64", () => {
    const { username, credential } = identifiantsTurn("secret", "u1", 1_000_000_000, 3600);
    expect(username).toBe(`${1_000_000 + 3600}:u1`);
    expect(credential).toBe(createHmac("sha1", "secret").update(username).digest("base64"));
  });
  it("serveurs ICE : STUN public sans coturn ; STUN + TURN avec coturn", () => {
    expect(serveursIce({}, "u1", 0)).toEqual([{ urls: "stun:stun.l.google.com:19302" }]);
    const s = serveursIce({ TURN_URLS: "turn:turn.exemple.ci:3478?transport=udp,turn:turn.exemple.ci:3478?transport=tcp", TURN_SECRET: "x" }, "u1", 0);
    expect(s[0].urls).toEqual(["stun:turn.exemple.ci:3478"]);
    expect(s[1].username).toMatch(/:u1$/);
  });
});

describe("registre des appels", () => {
  it("un seul appel actif par demande ; décrocher puis raccrocher", () => {
    const r = new RegistreAppels();
    expect(r.creer({ id: "a", demandeId: "d", appelantId: "sup", appelesIds: ["ch"] }, 0)).toBeTruthy();
    expect(r.creer({ id: "b", demandeId: "d", appelantId: "ch", appelesIds: ["sup"] }, 0)).toBeNull();
    expect(r.sonnentPour("ch").map((a) => a.id)).toEqual(["a"]);
    expect(r.decrocher("a", "intrus", 1)).toBeNull();
    const a = r.decrocher("a", "ch", 1000)!;
    expect(a.etat).toBe("EN_COURS");
    expect(r.correspondant(a, "sup")).toBe("ch");
    expect(r.correspondant(a, "ch")).toBe("sup");
    const fin = r.finir("a", "ANNULE", 61000)!;
    expect(fin.etat).toBe("TERMINE"); // un appel décroché finit toujours « terminé »
    expect(r.finir("a", "ANNULE", 62000)).toBeNull();
  });
  it("durée lisible", () => {
    expect(dureeLisible(5)).toBe("5 s");
    expect(dureeLisible(125)).toBe("2 min 05 s");
  });
});
