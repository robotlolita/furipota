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
  const { compact } = require('./utils')(furipota);
  const { primitive, stream, Stream } = furipota;

  const prefix = (x) => chalk.blue(x);
  const date = (x) => chalk.grey(x);
  const ok = (x) => chalk.green(x);
  const err = (x) => chalk.red(x);
  const close = (x) => chalk.grey(x);

  return {
    trace: (vm, stream, options) => { 
      const NONE = {};
      const show = (kind, data) => {
        const tag  = options['prefix'] || '[TRACE]';
        
        const date = options['date-format'] ? [date(moment().format(date-format))]
        :            /* else */               [];

        const inspectOptions = [
          options['show-hidden-properties'],
          options['depth'] == null ? 3 : options['depth'],
          options['color'] == null ? true : options['color']
        ];

        const value = data !== NONE ?  [inspect(data, ...inspectOptions)]
        :             /* else */       [];

        let line = [prefix(tag), kind, ...date, ...value];
        console.error(line.join(' '));
      }

      stream.subscribe({
        Value: (val) => show(ok ('OK   '), val),
        Error: (val) => show(err('ERROR'), val),
        Close: () =>    show(close('CLOSE'), NONE)
      });

      return stream;
    },

    log: (vm, value, options) => {
      console.log(value);
      return Stream.of(value);
    }
  };
};
