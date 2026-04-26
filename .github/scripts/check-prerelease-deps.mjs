import fs from 'node:fs/promises';

const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
const sections = ['dependencies', 'peerDependencies', 'optionalDependencies', 'bundledDependencies', 'bundleDependencies'];
const prereleasePattern = /-(alpha|beta|rc)\./;
const violations = [];

for (const section of sections) {
  const deps = pkg[section];
  if (!deps) continue;

  if (Array.isArray(deps)) {
    for (const dep of deps) {
      if (prereleasePattern.test(dep)) violations.push(`${section}: ${dep}`);
    }
    continue;
  }

  for (const [name, version] of Object.entries(deps)) {
    if (prereleasePattern.test(String(version))) {
      violations.push(`${section}: ${name}@${version}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Stable releases cannot depend on prerelease runtime dependencies:');
  for (const violation of violations) console.error(`- ${violation}`);
  console.error('Release stable dependency versions first, or publish this package as a prerelease.');
  process.exit(1);
}
