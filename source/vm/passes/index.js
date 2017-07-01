//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const desugarHoles = require('./desugar-holes');
const desugarApplication = require('./desugar-application');
const compose = require('folktale/core/lambda/compose');


const compile = compose(
  desugarHoles,
  desugarApplication
);


module.exports = compile;
