require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const jwt = require("jsonwebtoken");
(async () => {
  const token = jwt.sign(
    { sub: "37", name: "moh@gmail.com", roles: [] },
    process.env.JWT_SECRET,
    { issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE, expiresIn: "1h" }
  );
  const res = await fetch("http://localhost:5103/api/schools?level=Primary", {
    headers: { Authorization: "Bearer " + token },
  });
  const text = await res.text();
  console.log("status", res.status, "len", text.length, "preview", text.slice(0, 200));
})().catch(e => console.error(e));