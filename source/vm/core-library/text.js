//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { nativeModule, native, tagged } = furipota.primitives;

  return nativeModule('core:text', {
    concatenate:
    native('concatenate', [['Text', 'Text'], {}],
      'joins two portions of text together',
      (ctx, left, right, _options) => {
        return left + right;
      }
    )
  });
};
