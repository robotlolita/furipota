//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { nativeModule, native, shell } = furipota.primitives;
  const npmProject = require('./project')(furipota);

  return nativeModule('plugin:furipota-npm', {
    'project':
    native('project', [['^Path'], {}],
      'Constructs an npm instance for a project',
      (ctx, root, _options) => {
        return npmProject(root);
      }
    )
  });
};
