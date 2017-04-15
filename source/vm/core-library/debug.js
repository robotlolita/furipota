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

  const { inspect } = require('util');
  const { compact } = require('../../utils');
  const moment = require('moment');
  const chalk = require('chalk');
  const extend = require('xtend');
  const Maybe = require('folktale/data/maybe');


  function show(options, kind, data) {
    const prefix = Maybe.fromNullable(options['prefix']);
    const date   = Maybe.fromNullable(options['date-format']).map(x => date(moment().format(x)));
    
    const inspectOptions = [
      Boolean(options['show-hidden-properties']),
      Maybe.fromNullable(options.depth).getOrElse(3),
      Maybe.fromNullable(options.color).getOrElse(true)
    ];

    console.error([
      prefix.map(chalk.blue).getOrElse(''),
      kind,
      date.getOrElse(''),
      data.map(x => inspect(x, ...inspectOptions)).getOrElse('')
    ].filter(Boolean).join(' '));
  }

  const ShowOptions = {
    'prefix?': 'Text',
    'date-format?': 'Text',
    'show-hidden-properties?': 'Boolean',
    'depth?': 'Number',
    'color?': 'Boolean'
  };


  return nativeModule('core:debug', {
    log:
    native('log', [['Any'], ShowOptions],
      'shows an object on the screen',
      (ctx, value, options) => {
        show(options, '', Maybe.Just(value));
        return tagged('Unit', {});
      }
    ),

    trace:
    native('trace', [['Stream'], ShowOptions],
      'shows the events of a stream over time',
      (ctx, stream, options) => {
        stream.subscribe({
          Value: (x) => show(options, chalk.green('OK   '), Maybe.Just(x)),
          Error: (x) => show(options, chalk.red  ('ERROR'), Maybe.Just(x)),
          Close: ()  => show(options, chalk.grey ('CLOSE'), Maybe.Nothing())
        });

        return stream;
      }
    )
  });
};
