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
const { FuripotaVM } = require('./vm');
const package = require('../package.json');


const vm = new FuripotaVM();


function showError(error) {
  if (error.isFuripotaError) {
    console.error(error.message);
  } else {
    console.error(error.stack);
  }
}


program.version(package.version);

program.command('run <expression>')
  .option('-f, --file <file>', 'A file providing build definitions (default: build.frp)', 'build.frp')
  .description(`Runs the provided pipeline to completion.`)
  .action(async (expr, options) => {
    try {
      const fullPath = path.resolve(process.cwd(), options.file);
      const module = vm.loadModule(fullPath, 'furipota');
      const ast = vm.parseExpression(expr);
      const context = vm.context(module, module.environment);
      const stream = vm.evaluate(ast, context);
      vm.primitives.assertType('Stream', stream);

      stream.subscribe({
        Value(x){ },
        Error(x){
          console.log('Error:', x);
        },
        Close(){ }
      });
      await stream.run();
    } catch (error) {
      showError(error);
      process.exit(1);
    }
  });

program.command('list')
  .option('-f, --file <file>', 'A file providing build definitions (default: build.frp)', 'build.frp')
  .description(`Lists available commands.`)
  .action(async (options) => {
    try {
      const fullPath = path.resolve(process.cwd(), options.file);
      const module = vm.loadModule(fullPath, 'furipota');

      console.log('');
      console.log('Available commands:');
      console.log('-------------------');
      console.log('');

      const bindings = module.exportedBindings;
      const keys = Object.keys(bindings);
      const size = Math.max(...keys.map(x => x.length)) + 6;
      const docSize = 79 - size;

      const restrict = (text) => text.length > docSize ? `${text.slice(0, docSize - 3)}...` : text;

      Object.keys(bindings).forEach(k => {
        const value = bindings[k];
        console.log(`  ${k}    ${restrict(value.documentation || '')}`);
      });
    } catch (error) {
      showError(error);
      process.exit(1);
    }
  });


process.on('unhandledRejection', (error) => {
  showError(error);
  process.exit(1);
});

program.parse(process.argv);

if (process.argv.length < 3) {
  program.help();
}
