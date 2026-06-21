require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const jwt = require("jsonwebtoken");
(async () => {
  const token = jwt.sign(
    { sub: "37", name: "moh@gmail.com", fullName: "Maxamed abdi", roles: [] },
    process.env.JWT_SECRET,
    { issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE, expiresIn: "1h" }
  );
  const base = "http://localhost:5103";
  for (const url of [
    "/api/schools",
    "/api/schools?regionId=86",
    "/api/schools?level=Primary",
    "/api/schools?regionId=86&level=Primary",
    "/api/schools/levels",
  ]) {
    const res = await fetch(base + url, { headers: { Authorization: "Bearer " + token } });
    const data = await res.json();
    const count = Array.isArray(data) ? data.length : (data.totalCount ?? JSON.stringify(data).slice(0,80));
    console.log(url, "->", res.status, count);
  }
})().catch(e => console.error(e));