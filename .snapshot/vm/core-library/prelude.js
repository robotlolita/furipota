//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------


function extract(module, bindings) {
  let result = {};
  
  bindings.forEach(binding => {
    if (Array.isArray(binding)) {
      const [name, alias] = binding;
      result[alias] = module.environment.get(name);
    } else {
      result[binding] = module.environment.get(binding);
    }
  });

  return result;
}


module.exports = (furipota) => {
  const { nativeModule, native } = furipota.primitives;
  const extend = require('xtend');
  const Streams = require('./streams')(furipota);
  const Debug = require('./debug')(furipota);
  const Text = require('./text')(furipota);
  const Core = require('./core')(furipota);
  const Path = require('./path')(furipota);
  const FS = require('./filesystem')(furipota);
  const Vector = require('./vector')(furipota);
  const OS = require('./operating-system')(furipota);
  const Record = require('./record')(furipota);
  const Terminal = require('./terminal')(furipota);


  return nativeModule('core:prelude', extend(
    {
      Stream: Streams.environment.bindings,
      Debug: Debug.environment.bindings,
      Text: Text.environment.bindings,
      Path: Path.environment.bindings,
      Filsystem: FS.environment.bindings,
      Vector: Vector.environment.bindings,
      'Operating-System': OS.environment.bindings,
      Record: Record.environment.bindings,
      Terminal: Terminal.environment.bindings
    }, 
    extract(Streams, [
      ['concatenate', 'sequential'],
      ['merge', 'parallel'],
      'recover'
    ]),
    extract(Path, [
      ['from-text', 'path'],
      '/'
    ]),
    extract(FS, [
      'find', 'copy', 'make-directory', 'remove', 'Encoding',
      'list-directory', 'exists', 'read', 'write', 'symbolic-link',
      'unlink'
    ]),
    Core.environment.bindings,
    OS.environment.bindings
  ));
}