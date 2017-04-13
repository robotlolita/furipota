//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const chalk = require('chalk');
  const moment = require('moment');
  const { inspect } = require('util');
  const { stream, Stream } = furipota;
  
  const prefix = (x) => chalk.blue(x);
  const date = (x) => chalk.grey(x);

  return {
    trace: (vm, value, options) => {
      let line = [
        prefix(options.prefix || '[TRACE]'),
        ...(options['include-dates'] ?  [date(moment().format('hh:mm:ss'))] : []),
        inspect(value, options['show-hidden-properties'], options['depth'] || 3, options['colour'])
      ];

      console.error(line.join(' '))
      return Stream.of(value);
    }
  }
};