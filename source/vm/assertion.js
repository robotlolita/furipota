//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { inspect } = require('util');
const { getType, typeMatches } = require('./types');
const { error } = require('./errors');
const keys = Object.keys;

const SHOW_JS = process.env.DEBUG_FURIPOTA;


function hasComplexParameters(source) {
  return /[\{\[\=]/.test(source);
}

function inferParameterNames(fn) {
  const source = fn.toString().replace(/^(\*|async)\s*/, '');
  if (/^function/.test(source)) {
    const [_, args] = source.match(/[^\(]*\((.+)\)/) || ['', ''];
    if (args && !hasComplexParameters(args)) {
      return args.split(/\s*\,\s*/).trim();
    } else {
      return [];
    }
  } else {
    const [_, args] = source.match(/(.+?)=>/) || ['', ''];
    if (args && !hasComplexParameters(args)) {
      return args.split(/\s*\,\s*/).trim();
    } else {
      return [];
    }
  }
}

function formatOrdinal(x) {
  return x === 1 ?  '1st'
  :      x === 2 ?  '2nd'
  :      x === 3 ?  '3rd'
  :      /* else */ `${x}th`;
}


function assertParameters(name, types, optionTypes, parameters = null) {
  return (fn) => {
    const names = parameters || inferParameterNames(fn);
    const maybeName = (i) => names[i] ? ` (${names[i]})` : '';

    return (ctx, ...rest) => {
      assert(rest.length > 1, `Functions require at least one positional argument and one options argument`);
      const args = rest.slice(0, -1);
      const options = rest[rest.length - 1];

      ctx.assert(types.length === args.length, `${name} expects ${types.length} arguments, but ${args.length} were provided.`);
      types.forEach((t, i) => {
        ctx.assertType(t, args[i], `${name} expects ${t} in its ${formatOrdinal(i + 1)} parameter${maybeName(i)}, but got ${getType(args[i])} instead.`)
      });

      keys(optionTypes).filter(x => x !== '_').forEach(k => {
        const key = k.replace(/\?$/, '');
        const type = optionTypes[k];
        if (key in options) {
          ctx.assertType(type, options[key], `${name} expects ${type} for the option ${key}, but got ${getType(options[key])} instead.`);
        } else if (!/\?$/.test(k)) {
          ctx.assert(false, `${name} expects an option ${key} of type ${type}, but none was provided.`);
        }
      });

      return fn(ctx, ...rest);
    };
  }
}

function assert(expr, message) {
  if (!expr) {
    throw error('FAILED-ASSERTION', message);
  }
}

function assertType(type, value, message = null) {
  const actual = getType(value);
  const defaultMessage = `Expected a value of type ${type}, but got ${actual} instead.`;
  if (!typeMatches(type, value)) {
    let details = '';
    if (SHOW_JS) {
      details = `\n\n${inspect(value, true, 5, true)}\n`;
    }

    throw error('FAILED-ASSERTION', `${message || defaultMessage}${details}`);
  }
}


module.exports = { assertParameters, assert, assertType };
