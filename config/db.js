const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",       
  password: "",       
  database: "recept4"
});

module.exports = pool.promise();
