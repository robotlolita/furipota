//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { nativeModule, native, tagged, pathToText, textToPath, typeMatches } = furipota.primitives;
  const Path = require('path');

  return nativeModule('core:path', {
    'from-text':
    native('from-text', [['Text'], {}],
      'converts a piece of text to a filesystem path',
      (ctx, text, _options) => {
        return textToPath(text);
      }
    ),

    'to-text':
    native('to-text', [['^Path'], {}],
      'converts a filesystem path to a piece of text',
      (ctx, path, _options) => {
        return pathToText(path);
      }
    ),

    'is-root':
    native('is-root', [['^Path'], {}],
      'tests if a path is a root path',
      (ctx, path, _options) => {
        const data = Path.parse(pathToText(path));
        return data.root === data.dir;
      }
    ),

    'is-relative':
    native('is-relative', [['^Path'], {}],
      'tests if a path is a relative path',
      (ctx, path, _options) => {
        return !Path.isAbsolute(pathToText(path));
      }
    ),

    'is-absolute':
    native('is-absolute', [['^Path'], {}],
      'tests if a path is an absolute path',
      (ctx, path, _options) => {
        return Path.isAbsolute(pathToText(path));
      }
    ),

    resolve:
    native('resolve', [['Vector'], {}],
      'resolves a sequence of paths',
      (ctx, paths, _options) => {
        return textToPath(Path.resolve(...paths.map(pathToText)));
      }
    ),

    relative:
    native('relative', [['^Path'], { to: '^Path' }],
      'returns a path relative to the destination',
      (ctx, from, { to }) => {
        return textToPath(Path.relative(...[from, to].map(pathToText)));
      }
    ),

    directory:
    native('directory', [['^Path'], {}],
      'returns the directory portion of a path',
      (ctx, path, _options) => {
        return textToPath(Path.dirname(pathToText(path)));
      }
    ),

    normalize:
    native('normalize', [['^Path'], {}],
      'returns a normalised version of a path',
      (ctx, path, _options) => {
        return textToPath(Path.normalize(pathToText(path)));
      }
    ),

    'change-extension':
    native('change-extension', [['Text', '^Path'], {}],
      'changes the extension portion of a path',
      (ctx, extension, path, _options) => {
        ctx.assert(/^\./.test(extension) && !extension.includes(Path.separator), `Invalid file extension ${extension}.`);
        const oldPath = Path.parse(pathToText(path));
        const newPath = Path.join(oldPath.dir, oldPath.name + extension);

        return textToPath(newPath);
      }
    ),

    '/':
    native('/', [['^Path', 'Any'], {}],
      'joins paths and segments',
      (ctx, base, segment, _options) => {
        if (typeMatches('^Path', segment)) {
          return textToPath(Path.join(...[base, segment].map(pathToText)));
        } else if (typeMatches('Text', segment) && !segment.includes(Path.separator)) {
          return textToPath(Path.join(pathToText(base), segment));
        } else {
          ctx.assert(false, 'The second argument of Path./ should be a Path or a Text with a valid path segment');
        }
      }
    )
  });
};
