//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { 
    nativeModule, native, nativeThunk, textToPath, TPath, shell,
    TShellError, TShellExitCode, TShellOutput, TShellErrorOutput
  } = furipota.primitives;

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
    native('run', [[TPath, 'Vector'], {
        'working-directory?': TPath,
        'environment?': 'Record',
        'user-id?': 'Number',
        'group-id?': 'Number'
      }],
      'Runs a command',
      (ctx, command, args, options) => {
        return shell(command, args, options);
      }
    ),

    'Shell': {
      'Error':
      nativeThunk('Shell-Error', 'represents errors in shell',
        (ctx) => TShellError
      ),

      'Exit-Code':
      nativeThunk('Shell-Exit-Code', 'represents exit codes in shell',
        (ctx) => TShellExitCode
      ),

      'Output':
      nativeThunk('Shell-Output', 'represents output streams in shell',
        (ctx) => TShellOutput
      ),

      'Error-Output':
      nativeThunk('Shell-Error-Output', 'represents error output streams in shell',
        (ctx) => TShellErrorOutput
      )
    }
  });
};
