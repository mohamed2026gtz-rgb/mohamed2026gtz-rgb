require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const jwt = require("jsonwebtoken");

(async () => {
  const token = jwt.sign(
    { sub: "37", name: "moh@gmail.com", fullName: "Maxamed abdi", roles: [] },
    process.env.JWT_SECRET,
    { issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE, expiresIn: "1h" }
  );
  const base = "http://localhost:5103";
  const h = await fetch(base + "/health");
  console.log("health:", h.status);
  const schoolsRes = await fetch(base + "/api/schools?regionId=86&level=Primary", {
    headers: { Authorization: "Bearer " + token },
  });
  const schools = await schoolsRes.json();
  console.log("Schools status:", schoolsRes.status, "count:", Array.isArray(schools) ? schools.length : schools);
  const studentsRes = await fetch(base + "/api/students?regionId=86&level=Primary&page=1&pageSize=5", {
    headers: { Authorization: "Bearer " + token },
  });
  const students = await studentsRes.json();
  console.log("Students status:", studentsRes.status, "total:", students.totalCount);
})().catch(e => { console.error(e); process.exit(1); });