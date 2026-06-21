require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const jwt = require("jsonwebtoken");
(async () => {
  const adminToken = jwt.sign(
    { sub: "1", name: "admin@test.com", roles: ["System Admin"] },
    process.env.JWT_SECRET,
    { issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE, expiresIn: "1h" }
  );
  const userToken = jwt.sign(
    { sub: "37", name: "moh@gmail.com", roles: [] },
    process.env.JWT_SECRET,
    { issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE, expiresIn: "1h" }
  );
  const base = "http://localhost:5103";
  for (const [label, token] of [["admin", adminToken], ["region", userToken]]) {
    for (const url of ["/api/schools?level=Primary", "/api/schools?regionId=86&level=Primary"]) {
      const res = await fetch(base + url, { headers: { Authorization: "Bearer " + token } });
      const data = await res.json();
      console.log(label, url, data.length);
    }
  }
})().catch(e => console.error(e));