//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const extend = require('xtend');
const { mapValues } = require('folktale/core/object');


module.exports = {
  debug: (vm) =>
    vm.nativeModule('core:debug', null, require('./debug')(vm)),

  text: (vm) =>
    vm.nativeModule('core:text', null, require('./text')(vm)),

  stream: (vm) =>
    vm.nativeModule('core:stream', null, require('./stream')(vm)),

  filesystem: (vm) =>
    vm.nativeModule('core:filesystem', null, require('./filesystem')(vm)),

  os: (vm) =>
    vm.nativeModule('core:os', null, require('./os')(vm)),

  text: (vm) =>
    vm.nativeModule('core:text', null, require('./text')(vm)),

  core: (vm) =>
    vm.nativeModule('core:core', null, require('./core')(vm)),

  number: (vm) =>
    vm.nativeModule('core:number', null, require('./number')(vm)),

  prelude: (vm) => {
    const { primitive } = vm;

    const Debug = require('./debug')(vm);
    const Text = require('./text')(vm);
    const Stream = require('./stream')(vm);
    const Filesystem = require('./filesystem')(vm);
    const OS = require('./os')(vm);
    const Core = require('./core')(vm);
    const Number = require('./number')(vm);
    const Path = require('./path')(vm);

    return vm.nativeModule('core:prelude', null, extend(
      Debug, Text, Stream, Filesystem, OS, Core, Number,
      {
        '/': primitive(Path['/']),
        Debug: mapValues(Debug, primitive),
        Text: mapValues(Text, primitive),
        Stream: mapValues(Stream, primitive),
        Filesystem: mapValues(Filesystem, primitive),
        OS: mapValues(OS, primitive),
        Core: mapValues(Core, primitive),
        Number: mapValues(Number, primitive),
        Path: mapValues(Path, primitive)
      }
    ));
  }
};

