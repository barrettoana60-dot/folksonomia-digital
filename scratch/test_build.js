const { execSync } = require('child_process');
try {
  const result = execSync('npx tsc --noEmit', { stdio: 'inherit' });
} catch (e) {
  console.log("TSC FAILED");
}
