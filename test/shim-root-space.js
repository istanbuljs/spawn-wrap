const IS_WINDOWS = require('is-windows')();
const tap = require('tap');
const path = require('path');
const fs = require('fs');

tap.test('spaces in shim-root/homedir path on windows do not break wrapped npm calls', { skip: !IS_WINDOWS }, function(t) {
  // create temp folder with spaces in path
  process.env.SPAWN_WRAP_SHIM_ROOT = path.join(__dirname, 'fixtures', 'space path');

  // wrap with custom root path
  const sw = require('..');
  const unwrap = sw([]);

  // run a child process with an npm command
  const cp = require('child_process');
  const child = cp.exec('npm --version');
  child.on('exit', function(code) {
    t.equal(code, 0);
    unwrap();
    fs.rmdirSync(process.env.SPAWN_WRAP_SHIM_ROOT);
    t.end();
  });
});
