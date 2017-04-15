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
  const { primitive, Stream, assertType } = furipota;

  const wrap = (fn) => primitive((_, x, __) => fn(x));

  return {
    'display'(_, value, options) {
      process.stdout.write(value);
      return Stream.of(value);
    },

    'display-line'(_, value, __) {
      process.stdout.write(value + '\n');
      return Stream.of(value);
    },

    'display-error'(_, value, options) {
      process.stderr.write(value);
      return Stream.of(value);
    },

    'display-error-line'(_, value, options) {
      process.stderr.write(value + '\n');
      return Stream.of(value);
    },

    show(_, stream, options) {
      assertType('Debug.show', 'Stream', stream);
      stream.subscribe({
        Value: (x) => process.stdout.write(x),
        Error: (x) => process.stderr.write(x),
        Close: () => {}
      });
      return stream;
    },

    Terminal: {
      reset: wrap(chalk.reset),
      bold: wrap(chalk.bold),
      dim: wrap(chalk.dim),
      underline: wrap(chalk.underline),
      inverse: wrap(chalk.inverse),
      hidden: wrap(chalk.hidden),

      black: wrap(chalk.black),
      red: wrap(chalk.red),
      green: wrap(chalk.green),
      yellow: wrap(chalk.yellow),
      blue: wrap(chalk.blue),
      magenta: wrap(chalk.magenta),
      cyan: wrap(chalk.cyan),
      white: wrap(chalk.white),
      gray: wrap(chalk.gray),

      bg: {
        black: wrap(chalk.bgBlack),
        red: wrap(chalk.bgRed),
        green: wrap(chalk.bgGreen),
        yellow: wrap(chalk.bgYellow),
        blue: wrap(chalk.bgBlue),
        magenta: wrap(chalk.bgMagenta),
        cyan: wrap(chalk.bgCyan),
        white: wrap(chalk.bgWhite),
        gray: wrap(chalk.bgGray),        
      }
    } 
  }
};
