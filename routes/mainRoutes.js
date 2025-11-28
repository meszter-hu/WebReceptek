const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const passport = require("passport");

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.szerep === "admin") {
    return next();
  }
  res.redirect("/");
}

router.get("/", async (req, res) => {
  res.render("index");
});

router.get("/adatbazis", async (req, res) => {
  const [rows] = await db.query(
    "SELECT e.id, e.nev AS etel, k.nev AS kategoria, " +
      "GROUP_CONCAT(DISTINCT ho.nev SEPARATOR ', ') AS hozzavalok " +
      "FROM etel e " +
      "JOIN kategoria k ON e.kategoriaid = k.id " +
      "LEFT JOIN hasznalt h ON h.etelid = e.id " +
      "LEFT JOIN hozzavalo ho ON ho.id = h.hozzavaloid " +
      "GROUP BY e.id " +
      "ORDER BY e.nev"
  );
  res.render("adatbazis", { receptek: rows });
});

router.get("/kapcsolat", (req, res) => {
  res.render("kapcsolat");
});

router.post("/kapcsolat", async (req, res) => {
  const nev = req.body.nev || "";
  const email = req.body.email || "";
  const targy = req.body.targy || "";
  const uzenet = req.body.uzenet || "";
  const userId = req.user ? req.user.id : null;
  if (nev.trim() === "" || email.trim() === "" || uzenet.trim() === "") {
    req.flash("error", "Minden kotelezo mezot tolts ki");
    return res.redirect("/kapcsolat");
  }
  await db.query(
    "INSERT INTO uzenetek (nev, email, targy, uzenet, created_at, user_id) VALUES (?,?,?,?,NOW(),?)",
    [nev, email, targy, uzenet, userId]
  );
  req.flash("success", "Uzenet elkuldve");
  res.redirect("/kapcsolat");
});

router.get("/uzenetek", ensureAuthenticated, async (req, res) => {
  const [rows] = await db.query(
    "SELECT u.*, f.nev AS felhasznalo FROM uzenetek u " +
      "LEFT JOIN felhasznalok f ON f.id = u.user_id " +
      "ORDER BY u.created_at DESC"
  );
  res.render("uzenetek", { uzenetek: rows });
});

router.get("/crud/receptek", async (req, res) => {
  const [rows] = await db.query(
    "SELECT e.id, e.nev, k.nev AS kategoria, e.felirdatum, e.elsodatum " +
      "FROM etel e " +
      "LEFT JOIN kategoria k ON e.kategoriaid = k.id " +
      "ORDER BY e.id"
  );
  res.render("crud_lista", { receptek: rows });
});

router.get("/crud/receptek/uj", async (req, res) => {
  const [kategoriak] = await db.query(
    "SELECT id, nev FROM kategoria ORDER BY nev"
  );
  res.render("crud_form", { recept: null, kategoriak });
});

router.post("/crud/receptek/uj", async (req, res) => {
  const nev = req.body.nev || "";
  const kategoriaid = req.body.kategoriaid || null;
  const felirdatum = req.body.felirdatum || null;
  const elsodatum = req.body.elsodatum || null;
  if (nev.trim() === "" || !kategoriaid) {
    req.flash("error", "Nev es kategoria kotelezo");
    return res.redirect("/crud/receptek/uj");
  }
  await db.query(
    "INSERT INTO etel (nev, kategoriaid, felirdatum, elsodatum) VALUES (?,?,?,?)",
    [nev, kategoriaid, felirdatum, elsodatum]
  );
  res.redirect("/crud/receptek");
});

router.get("/crud/receptek/szerkeszt/:id", async (req, res) => {
  const id = req.params.id;
  const [[recept]] = await db.query("SELECT * FROM etel WHERE id = ?", [id]);
  const [kategoriak] = await db.query(
    "SELECT id, nev FROM kategoria ORDER BY nev"
  );
  if (!recept) {
    return res.redirect("/crud/receptek");
  }
  res.render("crud_form", { recept, kategoriak });
});

router.post("/crud/receptek/szerkeszt/:id", async (req, res) => {
  const id = req.params.id;
  const nev = req.body.nev || "";
  const kategoriaid = req.body.kategoriaid || null;
  const felirdatum = req.body.felirdatum || null;
  const elsodatum = req.body.elsodatum || null;
  if (nev.trim() === "" || !kategoriaid) {
    req.flash("error", "Nev es kategoria kotelezo");
    return res.redirect("/crud/receptek/szerkeszt/" + id);
  }
  await db.query(
    "UPDATE etel SET nev = ?, kategoriaid = ?, felirdatum = ?, elsodatum = ? WHERE id = ?",
    [nev, kategoriaid, felirdatum, elsodatum, id]
  );
  res.redirect("/crud/receptek");
});

router.get("/crud/receptek/torol/:id", async (req, res) => {
  const id = req.params.id;
  await db.query("DELETE FROM etel WHERE id = ?", [id]);
  res.redirect("/crud/receptek");
});

router.get("/register", (req, res) => {
  res.render("register");
});

router.post("/register", async (req, res) => {
  const nev = req.body.nev || "";
  const email = req.body.email || "";
  const jelszo = req.body.jelszo || "";
  const jelszo2 = req.body.jelszo2 || "";
  if (
    nev.trim() === "" ||
    email.trim() === "" ||
    jelszo.trim() === "" ||
    jelszo2.trim() === ""
  ) {
    req.flash("error", "Minden mezot tolts ki");
    return res.redirect("/register");
  }
  if (jelszo !== jelszo2) {
    req.flash("error", "A jelszavak nem egyeznek");
    return res.redirect("/register");
  }
  const [rows] = await db.query(
    "SELECT id FROM felhasznalok WHERE email = ?",
    [email]
  );
  if (rows.length > 0) {
    req.flash("error", "Ez az email mar foglalt");
    return res.redirect("/register");
  }
  const hash = await bcrypt.hash(jelszo, 10);
  await db.query(
    "INSERT INTO felhasznalok (nev, email, jelszo, szerep) VALUES (?,?,?,?)",
    [nev, email, hash, "regisztralt"]
  );
  req.flash("success", "Sikeres regisztracio, jelentkezz be");
  res.redirect("/login");
});

router.get("/login", (req, res) => {
  res.render("login");
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
  })
);

router.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

router.get("/admin", ensureAdmin, async (req, res) => {
  const [users] = await db.query(
    "SELECT id, nev, email, szerep FROM felhasznalok ORDER BY id"
  );
  res.render("admin", { users });
});

module.exports = router;
