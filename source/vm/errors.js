//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { inspect } = require('util');
const chalk = require('chalk');

const DEBUG = process.env.DEBUG_FURIPOTA;


const furipotaError = (name, message, trace = null, originalError = null) => {
  const showPrevStack = DEBUG && originalError;

  const prevStack = showPrevStack ? ['', 'JS stack:', originalError.stack]
                  : /* else */      [];

  const stack     = trace         ? ['', 'Stack:', '  ' + trace.format().join('\n  ')]
                  : /* else */      [];

  const error = new Error([`${chalk.red(name)}: ${message}`, ...stack, ...prevStack].join('\n'));
  error.name = name;
  error.isFuripotaError = true;
  error.furipotaShouldAssimilate = true;
  return error;
};


const error = (name, message) => {
  const theError = new Error(message);
  theError.name = name;
  theError.furipotaShouldAssimilate = true;
  return theError;
};


module.exports = { furipotaError, error };
