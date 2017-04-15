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

  return {
    'show-value'(_, value, options) {
      process.stdout.write(value);
      return Stream.of(value);
    },

    'display-error'(_, value, options) {
      process.stderr.write(value);
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
      reset: primitive(chalk.reset),
      bold: primitive(chalk.bold),
      dim: primitive(chalk.dim),
      underline: primitive(chalk.underline),
      inverse: primitive(chalk.inverse),
      hidden: primitive(chalk.hidden),

      black: primitive(chalk.black),
      red: primitive(chalk.red),
      green: primitive(chalk.green),
      yellow: primitive(chalk.yellow),
      blue: primitive(chalk.blue),
      magenta: primitive(chalk.magenta),
      cyan: primitive(chalk.cyan),
      white: primitive(chalk.white),
      gray: primitive(chalk.gray),

      bg: {
        black: primitive(chalk.bgBlack),
        red: primitive(chalk.bgRed),
        green: primitive(chalk.bgGreen),
        yellow: primitive(chalk.bgYellow),
        blue: primitive(chalk.bgBlue),
        magenta: primitive(chalk.bgMagenta),
        cyan: primitive(chalk.bgCyan),
        white: primitive(chalk.bgWhite),
        gray: primitive(chalk.bgGray),        
      }
    } 
  }
};
