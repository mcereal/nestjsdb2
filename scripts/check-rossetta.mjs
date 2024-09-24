// scripts/check-rossetta.js

import os from 'os';

const platform = os.platform();
const arch = os.arch();

if (platform === 'darwin' && arch === 'arm64') {
  console.warn(`
  ==============================================
  WARNING: You are running on an Apple Silicon Mac (arm64).
  The @mcereal/nestjsdb2 package relies on the ibm_db package,
  which requires Rosetta 2 to run properly.

  Please install Rosetta 2 by running:
    softwareupdate --install-rosetta --agree-to-license

  After installing Rosetta 2, please reinstall your dependencies:
    npm install
  ==============================================
  `);
}
