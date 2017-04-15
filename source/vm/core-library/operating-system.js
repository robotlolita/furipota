//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { nativeModule, native, nativeThunk, textToPath, shell } = furipota.primitives;

  return nativeModule('core:operating-system', {
    'current-directory':
    nativeThunk('current-directory', 'retrieves the current directory',
      (ctx) => textToPath(process.cwd())
    ),

    'environment':
    nativeThunk('environment', 'retrieves the environment variables',
      (ctx) => process.env
    ),

    'run':
    native('run', [['^Path', 'Vector'], {
        'working-directory?': '^Path',
        'environment?': 'Record',
        'user-id?': 'Number',
        'group-id?': 'Number'
      }],
      'Runs a command',
      (ctx, command, args, options) => {
        return shell(command, args, options);
      }
    )
  });
};
