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
const runtime = require('./runtime');
const package = require('../package.json');

const collect = (value, memo) => {
  memo.push(value);
  return memo;
};

const toModuleId = (module) => {
  if (/^\./.test(module)) {
    return path.resolve(process.cwd(), module);
  } else {
    return module;
  }
};


program.version(package.version);

program.command('run <file> <pipeline>')
  .description(`Runs the provided pipeline to completion.`)
  .option('-p, --plugin [module]', 'The module ID of a Furipota plugin', collect, [])
  .action(async (definitions, pipeline, options) => {
    try {
      const file = path.resolve(process.cwd(), definitions);
      const vm = new VM(path.dirname(file));
      vm.plugin(runtime);
      options.plugin.forEach(plugin => vm.plugin(require(toModuleId(plugin))));
      await vm.import(file);
      const stream = vm.global.get(pipeline).invoke(vm);
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