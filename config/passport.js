const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

module.exports = function (passport, db) {
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const [rows] = await db.query(
            "SELECT * FROM felhasznalok WHERE email = ?",
            [email]
          );
          if (rows.length === 0) {
            return done(null, false, { message: "Hibas email vagy jelszo" });
          }
          const user = rows[0];
          const match = await bcrypt.compare(password, user.password);

          if (!match) {
            return done(null, false, { message: "Hibas email vagy jelszo" });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const [rows] = await db.query(
        "SELECT * FROM felhasznalok WHERE id = ?",
        [id]
      );
      if (rows.length === 0) {
        return done(null, false);
      }
      done(null, rows[0]);
    } catch (err) {
      done(err);
    }
  });
};
