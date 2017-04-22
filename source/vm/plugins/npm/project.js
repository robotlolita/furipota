//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => (root) => {
  const { native, nativeThunk, shell, textToPath } = furipota.primitives;

  return {
    'install':
    nativeThunk('install', 'Install all dependencies for a project',
      (ctx) => {
        return shell(textToPath('npm'), ['install'], {
          'working-directory': root
        });
      }
    )
  };
};
