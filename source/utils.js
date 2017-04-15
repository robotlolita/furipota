//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

function compact(object) {
  const result = {};
  Object.keys(object).forEach(key => {
    const value = object[key];
    if (value !== undefined) {
      result[key] = value;
    }
  });
  return result;
}


module.exports = { compact };
