//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------


const program = require('commander');
const path = require('path');
const VM = require('./vm');
const package = require('../package.json');

const collect = (value, memo) => {
  memo.push(value);
  return memo;
};


program.version(package.version);

program.command('run <file> <expression>')
  .description(`Runs the provided pipeline to completion.`)
  .action(async (file, expr, options) => {
    try {
      const fullPath = path.resolve(process.cwd(), file);
      const vm = VM.fromFile(fullPath);
      const ast = vm.parseExpression(expr);
      const stream = vm.evaluate(ast, vm.module.environment);
      stream.subscribe({
        Value(x){ },
        Error(x){
          console.log('Error:', x);
        },
        Close(){ }
      });
      await stream.run();
    } catch (error) {
      console.error(error.stack);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (process.argv.length < 3) {
  program.help();
}
