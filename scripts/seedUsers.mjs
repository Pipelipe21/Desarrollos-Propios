// One-time provisioning script: creates the real Firebase Auth accounts (and
// role/department custom claims) that context/AuthContext.tsx verifies logins
// against. Run this once per environment, then delete or rotate the passwords.
//
// Setup:
//   1. Firebase Console > Project Settings > Service Accounts > Generate new
//      private key. Save the JSON somewhere OUTSIDE the repo (or as
//      scripts/service-account.json, which is gitignored).
//   2. cp scripts/seed-users.example.json scripts/seed-users.local.json
//      and fill in real, unique passwords for each person (this file is
//      gitignored — never commit real passwords).
//   3. Run:
//        GOOGLE_APPLICATION_CREDENTIALS=./scripts/service-account.json node scripts/seedUsers.mjs
//
// Safe to re-run: existing accounts are matched by email and only have their
// claims refreshed, they are not duplicated.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL_DOMAIN = 'dyd-industries.local';

const configPath = join(__dirname, 'seed-users.local.json');
let employees;
try {
  employees = JSON.parse(readFileSync(configPath, 'utf-8'));
} catch {
  console.error(
    `No se encontró ${configPath}.\n` +
    'Copia scripts/seed-users.example.json a scripts/seed-users.local.json y completa las contraseñas reales.'
  );
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const auth = getAuth();

for (const emp of employees) {
  const email = `${emp.username}@${EMAIL_DOMAIN}`;
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`Ya existe: ${emp.username} (${userRecord.uid}) — actualizando claims.`);
  } catch {
    userRecord = await auth.createUser({
      email,
      password: emp.password,
      displayName: emp.fullName,
    });
    console.log(`Creado: ${emp.username} (${userRecord.uid})`);
  }

  await auth.setCustomUserClaims(userRecord.uid, {
    role: emp.role,
    department: emp.department,
  });
}

console.log('Listo. Cada persona debe iniciar sesión en la app con su "username" y la contraseña asignada aquí.');
