// Creates the mainnet allocation vaults on THIS computer (offline key ceremony): one hash-based
// SLH-DSA-256s key per allocation, each encrypted with the passphrase you choose. Writes:
//   <dir>/<name>.json      encrypted key files (keep offline; back up on an encrypted USB)
//   <dir>/addresses.json   public addresses only, the input for scripts/mainnet-genesis.js
// Usage: node scripts/create-mainnet-vaults.js [--dir ~/arkthro-vault/mainnet] [--founder 50000000]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { generateKeyPair, addressFromPublicKey } from '../src/crypto.js';
import { encryptKeyFile, askPassphrase } from '../src/keyfile.js';

const { values } = parseArgs({ options: { dir: { type: 'string' }, founder: { type: 'string', default: '50000000' } } });
const dir = values.dir ?? path.join(os.homedir(), 'arkthro-vault', 'mainnet');
const VAULTS = ['ecosystem', 'treasury', 'publicDistribution', 'partners', 'teamPool', 'liquidity', 'founder'];
const MIN = 16;

fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const existing = VAULTS.filter((v) => fs.existsSync(path.join(dir, `${v}.json`)));
if (existing.length) {
  console.error(`Vaults already exist in ${dir} (${existing.join(', ')}). Nothing was changed.`);
  process.exit(1);
}
console.log(`This creates ${VAULTS.length} mainnet vault keys, all locked with ONE passphrase.`);
console.log(`Use at least ${MIN} characters, e.g. five random words. Letters don't show while typing.`);
console.log('Write it on paper and keep it safe. Nobody can reset it.\n');
const pass = await askPassphrase('New passphrase: ');
if (pass.length < MIN) { console.error(`The passphrase must be at least ${MIN} characters.`); process.exit(1); }
if (await askPassphrase('Repeat the passphrase: ') !== pass) { console.error('The two passphrases are different. Nothing was created.'); process.exit(1); }

const addresses = {};
for (const name of VAULTS) {
  process.stdout.write(`Creating ${name} vault… `);
  const k = generateKeyPair('slh-dsa-256s');
  const file = { address: addressFromPublicKey(k.publicKey), ...k };
  fs.writeFileSync(path.join(dir, `${name}.json`), `${JSON.stringify(encryptKeyFile(file, pass), null, 2)}\n`, { mode: 0o600 });
  addresses[name] = file.address;
  console.log(file.address);
}
const out = {
  _note: 'Public addresses only. The encrypted keys are the .json files next to this one.',
  addresses: {
    ecosystem: addresses.ecosystem, treasury: addresses.treasury, publicDistribution: addresses.publicDistribution,
    partners: addresses.partners, teamPool: addresses.teamPool, liquidity: addresses.liquidity,
    founders: { [addresses.founder]: values.founder },
  },
};
fs.writeFileSync(path.join(dir, 'addresses.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`\nDone. ${VAULTS.length} encrypted vault keys are in ${dir}.`);
