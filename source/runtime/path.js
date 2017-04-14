//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const path = require('path');
  const { primitive, tagged, assertType, getType, extend } = furipota;

  const toPath = (data) => ({
    base: data.base,
    filename: data.name,
    extension: data.ext,
    _fullpath: path.format(data)
  });

  const fromPath = (data) => {
    assertType('value', '^Path', data);
    return data.value._fullpath;
  }

  const module = {
    'from-text'(_, text) {
      assertType('Path.from-text text', 'Text', text);
      return tagged('Path', toPath(path.parse(text)));
    },

    'to-text'(_, path) {
      assertType('Path.to-text path', '^Path', path);
      return path.value._fullpath;
    },

    join(_, paths) {
      assertType('Path.join paths', 'Vector', paths);
      const newPath = path.join(...paths.map(fromPath));
      return tagged('Path', toPath(path.parse(newPath)));
    },

    resolve(_, paths) {
      assertType('Path.resolve paths', 'Vector', paths);
      const newPath = path.resolve(...paths.map(fromPath));
      return tagged('Path', toPath(path.parse(newPath)));
    },

    relative(_, from, { to }) {
      assertType('Path.relative from _', '^Path', from);
      assertType('Path.relative _ to: x', '^Path', to);
      const newPath = path.relative(...[from, to].map(fromPath));
      return tagged('Path', toPath(path.parse(newPath)));
    },

    directory(_, p) {
      assertType('Path.directory path', '^Path', p);
      return tagged('Path', toPath(path.parse(path.dirname(fromPath(p)))));
    },

    normalize(_, p) {
      assertType('Path.normalize path', '^Path', p);
      return tagged('Path', toPath(path.parse(path.normalize(fromPath(p)))))
    },

    'change-extension'(_, ext) {
      return primitive((_, p) => {
        assertType('Path.change-extension ext _', 'Text', ext);
        assertType('Path.change-extension _ path', '^Path', p);
        if (!/^\./.test(ext) || ext.includes(path.separator)) {
          throw new Error(`Invalid file extension ${ext}`);
        }

        const oldPath = path.parse(p.value._fullpath);
        const newPath = path.join(oldPath.dir, oldPath.name + ext);

        return tagged('Path', toPath(path.parse(newPath)));
      })
    },

    '/'(_, base) {
      return primitive((_, segment) => {
        assertType('x / _', '^Path', base);
        if (getType(segment) === '^Path') {
          return module.join(_, [base, segment]);
        } else if (typeof segment === 'string' && !segment.includes(path.separator)) {
          return tagged('Path', toPath(path.parse(path.join(fromPath(base), segment))));
        } else {
          throw new TypeError(`_ / x should be a Path or a Text with a valid segment`);
        }
      });
    }
  };

  return module;
};