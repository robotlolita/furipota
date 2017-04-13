//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const extend = require('xtend');

  return extend(
    require('./debug')(furipota),
    require('./file')(furipota),
    require('./core')(furipota)
  );
};