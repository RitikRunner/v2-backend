import { expect } from "chai";
import * as sinon from "sinon";
import { api } from "../support/app";
import { redis } from "../../config/redis";

describe("GET /health", () => {
  it("returns 200 when Postgres and Redis are up", async () => {
    const res = await api().get("/health");
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ status: "ok", db: "ok", redis: "ok" });
  });

  it("returns 503 when Redis is unreachable", async () => {
    const stub = sinon.stub(redis, "ping").rejects(new Error("down"));
    try {
      const res = await api().get("/health");
      expect(res.status).to.equal(503);
      expect(res.body.status).to.equal("degraded");
      expect(res.body.db).to.equal("ok");
      expect(res.body.redis).to.equal("down");
    } finally {
      stub.restore();
    }
  });
});
