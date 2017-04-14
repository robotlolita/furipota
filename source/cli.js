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

program.command('run <expression>')
  .option('-f, --file <file>', 'A file providing build definitions (default: build.frp)', 'build.frp')
  .description(`Runs the provided pipeline to completion.`)
  .action(async (expr, options) => {
    try {
      const fullPath = path.resolve(process.cwd(), options.file);
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
      if (error.isFuripotaError) {
        console.error(error.message);
      } else {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.command('list')
  .option('-f, --file <file>', 'A file providing build definitions (default: build.frp)', 'build.frp')
  .description(`Lists available commands.`)
  .action(async (options) => {
    try {
      const fullPath = path.resolve(process.cwd(), options.file);
      const vm = VM.fromFile(fullPath);

      console.log('');
      console.log('Available commands:');
      console.log('-------------------');
      console.log('');

      const bindings = vm.module.exportedBindings;
      const keys = Object.keys(bindings);
      const size = Math.max(...keys.map(x => x.length)) + 6;
      const docSize = 79 - size;

      const restrict = (text) => text.length > docSize ? `${text.slice(0, docSize - 3)}...` : text;

      Object.keys(bindings).forEach(k => {
        const value = bindings[k];
        console.log(`  ${k}    ${restrict(value.documentation || '')}`);
      });
    } catch (error) {
      console.error(error.stack);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (process.argv.length < 3) {
  program.help();
}
