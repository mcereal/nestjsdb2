const { execSync } = require('child_process');

const bumpType = process.env.INPUT_BUMP_TYPE || 'patch';
const newVersion = execSync(`npm version ${bumpType} --no-git-tag-version`)
  .toString()
  .trim();

console.log(`::set-output name=new_version::${newVersion}`);
