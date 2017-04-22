//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { nativeModule, native, tagged, ok, error } = furipota.primitives;
  const hasOwn = Function.call.bind(Object.prototype.hasOwnProperty);

  return nativeModule('core:record', {
    'has':
    native('has', [['Record', 'Text'], {}],
      'true if the record contains a property',
      (ctx, record, property, _options) => {
        return hasOwn(record, property);
      }
    ),

    'get':
    native('get', [['Record', 'Text'], {}],
      'maybe returns the property',
      (ctx, record, property, _options) => {
        if (hasOwn(record, property)) {
          return ok(record[property]);
        } else {
          return error(`The record has no property ${property}`);
        }
      }
    ),

    'merge':
    native('merge', [['Record', 'Record'], {}],
      'merges two records',
      (ctx, left, right, _options) => {
        return Object.assign({}, left, right);
      }
    )
  });
};
