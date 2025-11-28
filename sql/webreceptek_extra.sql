CREATE TABLE IF NOT EXISTS felhasznalok (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nev VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  jelszo VARCHAR(255) NOT NULL,
  szerep ENUM('latogato','regisztralt','admin') NOT NULL DEFAULT 'regisztralt'
);

INSERT INTO felhasznalok (nev, email, jelszo, szerep)
VALUES (
  'Admin Felhasznalo',
  'admin@admin.hu',
  '$2b$10$KqtH7HqgXxKJ4d9nB4YlUuCjqEx0FG5kN4s8CwLrI0tXHYJzbzR1W',
  'admin'
);

CREATE TABLE IF NOT EXISTS uzenetek (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nev VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  targy VARCHAR(200),
  uzenet TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  user_id INT NULL,
  CONSTRAINT fk_uzenet_user FOREIGN KEY (user_id) REFERENCES felhasznalok(id)
);
