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
const { typeMatches } = require('./vm/types');
const { show } = require('./vm/primitives');
const { inspect } = require('util');
const package = require('../package.json');
const Maybe = require('folktale/maybe');


const vm = new FuripotaVM();


function showError(error) {
  if (error.isFuripotaError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(error.stack);
  } else {
    console.error(error);
  }
}


function die(expr, error) {
  console.error(`\n\n${'-'.repeat(3)}`);
  console.error(`There was a problem trying to execute ${JSON.stringify(expr)}.\n`);
  showError(error);
  process.exit(1);
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

      if (typeMatches('Stream', stream)) {
        stream.subscribe({
          Value: ()  => { },
          Error: (e) => { 
            die(expr, e);
          },
          Close: ()  => { }
        });
        await stream.run();
      } else {
        console.log(inspect(show(context, stream), false, 5, true));
      }
    } catch (error) {
      die(expr, error);
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
