//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const extend = require('xtend');


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

  prelude: (vm) => {
    const Debug = require('./debug')(vm);
    const Text = require('./text')(vm);
    const Stream = require('./stream')(vm);
    const Filesystem = require('./filesystem')(vm);
    const OS = require('./os')(vm);

    return vm.nativeModule('core:prelude', null, extend(
      Debug,
      Text,
      Stream,
      Filesystem,
      OS
    ));
  }
};

